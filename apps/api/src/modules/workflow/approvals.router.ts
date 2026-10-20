import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../shared/rbac";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";

const router = Router();

const DecideSchema = z.object({
  decision: z.enum(["APPROVED","REJECTED"]),
  notes: z.string().min(1),
});

router.get("/", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const status = req.query.status ? String(req.query.status) : "PENDING";

    const { rows } = await getPool().query(
      `SELECT * FROM approval_requests WHERE tenant_id=$1 AND status=$2 ORDER BY requested_at DESC LIMIT 200`,
      [tenantId, status]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/:approvalId/decide", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = DecideSchema.parse(req.body);

    const approvalId = req.params.approvalId;
    const aRes = await getPool().query(
      `SELECT * FROM approval_requests WHERE tenant_id=$1 AND id=$2`,
      [tenantId, approvalId]
    );
    const approval = aRes.rows[0];
    if (!approval) throw new HttpError(404, "Approval request not found");
    if (approval.status !== "PENDING") throw new HttpError(400, "Approval already decided");

    // Decide
    await getPool().query(
      `UPDATE approval_requests SET status=$1, decided_by=$2, decided_at=now(), notes=notes || E'\nDECISION NOTE: ' || $3
       WHERE tenant_id=$4 AND id=$5`,
      [body.decision, req.user!.id, body.notes, tenantId, approvalId]
    );

    // Apply side-effects for known entity types
    if (approval.entity_type === "FINANCE_EDIT") {
      const editId = approval.entity_id;
      const eRes = await getPool().query(
        `SELECT * FROM finance_edit_requests WHERE tenant_id=$1 AND id=$2`,
        [tenantId, editId]
      );
      const edit = eRes.rows[0];
      if (!edit) throw new HttpError(400, "Edit request not found");

      if (body.decision === "APPROVED") {
        const txRes = await getPool().query(
          `SELECT * FROM finance_transactions WHERE tenant_id=$1 AND id=$2`,
          [tenantId, edit.tx_id]
        );
        const tx = txRes.rows[0];
        if (!tx) throw new HttpError(400, "Target transaction not found");

        const proposed = edit.proposed_changes || {};
        // Only allow certain fields to be updated (scaffold guard)
        const allowed = ["amount","effective_date","external_ref","notes","category_id","subcategory_id"];
        const updates: string[] = [];
        const values: any[] = [req.user!.id];
        let idx = 2;

        for (const k of allowed) {
          if (proposed[k] !== undefined) {
            updates.push(`${k}=$${idx++}`);
            values.push(proposed[k]);
          }
        }
        if (updates.length === 0) throw new HttpError(400, "No allowed fields in proposed_changes");
        values.push(tenantId, edit.tx_id);

        await getPool().query(
          `UPDATE finance_transactions SET updated_by=$1, updated_at=now(), ${updates.join(", ")}
           WHERE tenant_id=$${idx++} AND id=$${idx}`,
          values
        );

        await getPool().query(
          `UPDATE finance_edit_requests SET status='APPROVED' WHERE tenant_id=$1 AND id=$2`,
          [tenantId, editId]
        );

        await audit(req, {
          action: "APPROVAL_APPLIED_FINANCE_EDIT",
          entity_type: "FINANCE_TX",
          entity_id: edit.tx_id,
          notes: body.notes,
          before_json: tx,
          after_json: proposed,
        });
      } else {
        await getPool().query(
          `UPDATE finance_edit_requests SET status='REJECTED' WHERE tenant_id=$1 AND id=$2`,
          [tenantId, editId]
        );
      }
    }

    await audit(req, {
      action: "APPROVAL_DECIDE",
      entity_type: "APPROVAL_REQUEST",
      entity_id: approvalId,
      notes: body.notes,
      before_json: approval,
      after_json: { decision: body.decision },
    });

    res.json({ ok: true, decision: body.decision });
  } catch (err) {
    next(err);
  }
});

export default router;
