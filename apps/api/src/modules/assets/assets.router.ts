import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../shared/rbac";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";

const router = Router();

// Vehicles
const VehicleSchema = z.object({
  plate_number: z.string().min(2),
  make_model: z.string().optional(),
  year: z.number().int().optional(),
  box_installed: z.boolean().optional(),
  same_brand: z.boolean().optional(),
  advertisement: z.boolean().optional(),
  box_installed_from: z.string().optional(),
  box_installed_at: z.string().optional(),
  advertisement_permit_expiry: z.string().optional(),
  status: z.enum(["IN_STOCK","ASSIGNED","DAMAGED","UNDER_REPAIR","LOST","REMOVED"]).optional(),
  notes: z.string().min(1),
});

router.get("/vehicles", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const onlyStock = String(req.query.only_stock || "false") === "true";
    const where = onlyStock ? "AND status='IN_STOCK'" : "";
    const { rows } = await getPool().query(
      `SELECT * FROM vehicles WHERE tenant_id=$1 ${where} ORDER BY updated_at DESC LIMIT 500`,
      [tenantId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/vehicles", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = VehicleSchema.parse(req.body);

    const { rows } = await getPool().query(
      `INSERT INTO vehicles(
        tenant_id, plate_number, make_model, year, box_installed, same_brand, advertisement, box_installed_from, box_installed_at,
        advertisement_permit_expiry, status, notes, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
      RETURNING *`,
      [
        tenantId,
        body.plate_number,
        body.make_model || "",
        body.year || null,
        body.box_installed ?? false,
        body.same_brand ?? false,
        body.advertisement ?? false,
        body.box_installed_from || null,
        body.box_installed_at || null,
        body.advertisement_permit_expiry || null,
        body.status || "IN_STOCK",
        body.notes,
        req.user!.id
      ]
    );

    await audit(req, {
      action: "VEHICLE_CREATE",
      entity_type: "VEHICLE",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// SIMs
const SimSchema = z.object({
  card_number: z.string().min(2),
  owner: z.enum(["CWDS","CLIENT"]).optional(),
  pickup_purchase_date: z.string().optional(),
  status: z.enum(["IN_STOCK","ASSIGNED","LOST","REPLACED","REMOVED"]).optional(),
  notes: z.string().min(1),
});

router.get("/sims", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const onlyStock = String(req.query.only_stock || "false") === "true";
    const where = onlyStock ? "AND status='IN_STOCK'" : "";
    const { rows } = await getPool().query(
      `SELECT * FROM sims WHERE tenant_id=$1 ${where} ORDER BY updated_at DESC LIMIT 500`,
      [tenantId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/sims", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = SimSchema.parse(req.body);
    const { rows } = await getPool().query(
      `INSERT INTO sims(tenant_id, card_number, owner, pickup_purchase_date, status, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [tenantId, body.card_number, body.owner || "CWDS", body.pickup_purchase_date || null, body.status || "IN_STOCK", body.notes, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Other assets
const OtherAssetSchema = z.object({
  item_type_id: z.string().uuid().optional(),
  description: z.string().optional(),
  owner: z.enum(["CWDS","CLIENT"]).optional(),
  purchase_pickup_date: z.string().optional(),
  status: z.enum(["IN_STOCK","ASSIGNED","ASSIGNED_ON_LEAVE","DAMAGED","LOST","RETURNED_TO_CWDS","RETURNED_TO_CLIENT","REMOVED"]).optional(),
  notes: z.string().min(1),
});

router.get("/other-assets", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const onlyStock = String(req.query.only_stock || "false") === "true";
    const where = onlyStock ? "AND status='IN_STOCK'" : "";
    const { rows } = await getPool().query(
      `SELECT * FROM other_assets WHERE tenant_id=$1 ${where} ORDER BY updated_at DESC LIMIT 500`,
      [tenantId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/other-assets", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = OtherAssetSchema.parse(req.body);
    const { rows } = await getPool().query(
      `INSERT INTO other_assets(tenant_id, item_type_id, description, owner, purchase_pickup_date, status, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [tenantId, body.item_type_id || null, body.description || "", body.owner || "CWDS", body.purchase_pickup_date || null, body.status || "IN_STOCK", body.notes, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Assign/unassign/replacement hooks (TODO: implement strict logic)
const AssignSchema = z.object({
  driver_id: z.string().uuid(),
  asset_type: z.enum(["VEHICLE","SIM","OTHER"]),
  asset_id: z.string().uuid(),
  notes: z.string().min(1),
});

router.post("/assign", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = AssignSchema.parse(req.body);

    // TODO: enforce availability rules + update asset status accordingly
    const { rows } = await getPool().query(
      `INSERT INTO asset_assignments(tenant_id, driver_id, asset_type, asset_id, status, notes, created_by)
       VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6) RETURNING *`,
      [tenantId, body.driver_id, body.asset_type, body.asset_id, body.notes, req.user!.id]
    );

    await audit(req, {
      action: "ASSET_ASSIGN",
      entity_type: "ASSET_ASSIGNMENT",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

const UnassignSchema = z.object({
  assignment_id: z.string().uuid(),
  status: z.enum(["RETURNED","RETURNED_TO_CLIENT","ON_LEAVE","REPLACED"]),
  reason: z.string().min(1),
  notes: z.string().min(1),
});

router.post("/unassign", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = UnassignSchema.parse(req.body);

    const aRes = await getPool().query(
      `SELECT * FROM asset_assignments WHERE tenant_id=$1 AND id=$2`,
      [tenantId, body.assignment_id]
    );
    const a = aRes.rows[0];
    if (!a) throw new HttpError(404, "Assignment not found");

    await getPool().query(
      `UPDATE asset_assignments SET status=$1, unassigned_at=now(), reason=$2, notes=notes || E'\nUNASSIGN NOTE: ' || $3
       WHERE tenant_id=$4 AND id=$5`,
      [body.status, body.reason, body.notes, tenantId, body.assignment_id]
    );

    await audit(req, {
      action: "ASSET_UNASSIGN",
      entity_type: "ASSET_ASSIGNMENT",
      entity_id: body.assignment_id,
      notes: body.notes,
      before_json: a,
      after_json: { status: body.status, reason: body.reason },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
