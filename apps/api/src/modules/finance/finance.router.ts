import { Router } from "express";
import { requireRole } from "../../shared/rbac";
import { CreateTxSchema, EditRequestSchema } from "./finance.schemas";
import { audit } from "../../shared/audit";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { listTransactions, listCategories, listSubcategories } from "./finance.service";

const router = Router();

// List transactions
router.get("/transactions", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const result = await listTransactions({ tenantId: req.tenantId!, query: req.query });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Create transaction (Add is allowed by permitted users; status defaults to POSTED)
router.post("/transactions", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = CreateTxSchema.parse(req.body);

    // Validate category/subcategory belong to tenant
    const cat = await getPool().query(
      `SELECT id FROM finance_categories WHERE tenant_id=$1 AND id=$2 AND enabled=true`,
      [tenantId, body.category_id]
    );
    if (!cat.rows[0]) throw new HttpError(400, "Invalid category");

    const sub = await getPool().query(
      `SELECT id FROM finance_subcategories WHERE tenant_id=$1 AND id=$2 AND enabled=true AND category_id=$3`,
      [tenantId, body.subcategory_id, body.category_id]
    );
    if (!sub.rows[0]) throw new HttpError(400, "Invalid subcategory");

    const { rows } = await getPool().query(
      `INSERT INTO finance_transactions(
        tenant_id, driver_id, tx_type, category_id, subcategory_id, amount, currency, effective_date, status, external_ref, notes, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'POSTED',$9,$10,$11,$11)
      RETURNING *`,
      [
        tenantId,
        body.driver_id || null,
        body.tx_type,
        body.category_id,
        body.subcategory_id,
        body.amount,
        body.currency,
        body.effective_date,
        body.external_ref || null,
        body.notes,
        req.user!.id
      ]
    );

    await audit(req, {
      action: "FINANCE_TX_CREATE",
      entity_type: "FINANCE_TX",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Edit request (approval required)
router.post("/transactions/:txId/edit-request", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const txId = req.params.txId;
    const body = EditRequestSchema.parse(req.body);

    const txRes = await getPool().query(
      `SELECT * FROM finance_transactions WHERE tenant_id=$1 AND id=$2`,
      [tenantId, txId]
    );
    const tx = txRes.rows[0];
    if (!tx) throw new HttpError(404, "Transaction not found");
    if (tx.status === "VOIDED") throw new HttpError(400, "Cannot edit VOIDED transaction");

    const { rows: editRows } = await getPool().query(
      `INSERT INTO finance_edit_requests(tenant_id, tx_id, proposed_changes, status, requested_by, notes)
       VALUES ($1,$2,$3,'PENDING',$4,$5) RETURNING *`,
      [tenantId, txId, JSON.stringify(body.proposed_changes), req.user!.id, body.notes]
    );

    const { rows: approvalRows } = await getPool().query(
      `INSERT INTO approval_requests(tenant_id, entity_type, entity_id, action_type, status, requested_by, notes, payload)
       VALUES ($1,'FINANCE_EDIT',$2,'EDIT','PENDING',$3,$4,$5) RETURNING *`,
      [tenantId, editRows[0].id, req.user!.id, body.notes, JSON.stringify({ tx_id: txId, proposed_changes: body.proposed_changes })]
    );

    await audit(req, {
      action: "FINANCE_TX_EDIT_REQUEST",
      entity_type: "FINANCE_EDIT",
      entity_id: editRows[0].id,
      notes: body.notes,
      before_json: tx,
      after_json: body.proposed_changes,
    });

    res.json({ ok: true, edit_request: editRows[0], approval_request: approvalRows[0] });
  } catch (err) {
    next(err);
  }
});

// Void transaction (Super Admin only)
router.post("/transactions/:txId/void", requireRole(["SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const txId = req.params.txId;
    const notes = String(req.body?.notes || "").trim();
    if (!notes) throw new HttpError(400, "notes is required");

    const txRes = await getPool().query(`SELECT * FROM finance_transactions WHERE tenant_id=$1 AND id=$2`, [tenantId, txId]);
    const tx = txRes.rows[0];
    if (!tx) throw new HttpError(404, "Transaction not found");
    if (tx.status === "VOIDED") return res.json({ ok: true, status: "VOIDED" });

    await getPool().query(
      `UPDATE finance_transactions SET status='VOIDED', updated_at=now(), updated_by=$1, notes=notes || E'\nVOID NOTE: ' || $2
       WHERE tenant_id=$3 AND id=$4`,
      [req.user!.id, notes, tenantId, txId]
    );

    await audit(req, {
      action: "FINANCE_TX_VOID",
      entity_type: "FINANCE_TX",
      entity_id: txId,
      notes,
      before_json: tx,
      after_json: { status: "VOIDED" },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Categories/subcategories list
router.get("/categories", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const txType = req.query.tx_type ? String(req.query.tx_type) : undefined;
    const rows = await listCategories(req.tenantId!, txType);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/categories/:categoryId/subcategories", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const rows = await listSubcategories(req.tenantId!, req.params.categoryId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
