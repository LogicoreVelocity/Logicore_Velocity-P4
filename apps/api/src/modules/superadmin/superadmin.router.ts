import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../shared/rbac";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";

const router = Router();

const SettingUpsertSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  notes: z.string().min(1),
});

router.get("/settings", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const key = req.query.key ? String(req.query.key) : null;
    if (key) {
      const { rows } = await getPool().query(`SELECT * FROM superadmin_settings WHERE tenant_id=$1 AND key=$2`, [tenantId, key]);
      return res.json(rows[0] || null);
    }
    const { rows } = await getPool().query(`SELECT * FROM superadmin_settings WHERE tenant_id=$1 ORDER BY key ASC`, [tenantId]);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put("/settings", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = SettingUpsertSchema.parse(req.body);

    const { rows } = await getPool().query(
      `INSERT INTO superadmin_settings(tenant_id, key, value, notes, updated_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, key)
       DO UPDATE SET value=EXCLUDED.value, notes=EXCLUDED.notes, updated_by=EXCLUDED.updated_by, updated_at=now()
       RETURNING *`,
      [tenantId, body.key, JSON.stringify(body.value), body.notes, req.user!.id]
    );

    await audit(req, {
      action: "SUPERADMIN_SETTING_UPSERT",
      entity_type: "SETTING",
      entity_id: body.key,
      notes: body.notes,
      after_json: rows[0],
    });

    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Sheet sources
const SheetSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(4),
  mapping_json: z.any(),
  scope: z.any().optional(),
  schedule_minutes: z.number().int().min(15).default(180),
  enabled: z.boolean().default(true),
  notes: z.string().min(1),
});

router.get("/sheet-sources", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM sheet_sources WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [req.tenantId!]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/sheet-sources", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = SheetSourceSchema.parse(req.body);

    const { rows } = await getPool().query(
      `INSERT INTO sheet_sources(tenant_id, name, url, mapping_json, scope, schedule_minutes, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
       RETURNING *`,
      [tenantId, body.name, body.url, JSON.stringify(body.mapping_json), JSON.stringify(body.scope || {}), body.schedule_minutes, body.enabled, body.notes, req.user!.id]
    );

    await audit(req, {
      action: "SHEET_SOURCE_CREATE",
      entity_type: "SHEET_SOURCE",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put("/sheet-sources/:id", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = SheetSourceSchema.partial().extend({ notes: z.string().min(1) }).parse(req.body);

    const existing = await getPool().query(`SELECT * FROM sheet_sources WHERE tenant_id=$1 AND id=$2`, [tenantId, req.params.id]);
    if (!existing.rows[0]) throw new HttpError(404, "Sheet source not found");

    const merged = { ...existing.rows[0], ...body };

    const { rows } = await getPool().query(
      `UPDATE sheet_sources
       SET name=$1, url=$2, mapping_json=$3, scope=$4, schedule_minutes=$5, enabled=$6, notes=$7, updated_by=$8, updated_at=now()
       WHERE tenant_id=$9 AND id=$10
       RETURNING *`,
      [
        merged.name,
        merged.url,
        JSON.stringify(merged.mapping_json),
        JSON.stringify(merged.scope || {}),
        merged.schedule_minutes,
        merged.enabled,
        body.notes,
        req.user!.id,
        tenantId,
        req.params.id
      ]
    );

    await audit(req, {
      action: "SHEET_SOURCE_UPDATE",
      entity_type: "SHEET_SOURCE",
      entity_id: rows[0].id,
      notes: body.notes,
      before_json: existing.rows[0],
      after_json: rows[0],
    });

    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Finance master data (categories/subcategories)
const CategorySchema = z.object({
  tx_type: z.enum(["PAYABLE","RECEIVABLE"]),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  notes: z.string().min(1),
});

router.post("/finance/categories", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = CategorySchema.parse(req.body);
    const { rows } = await getPool().query(
      `INSERT INTO finance_categories(tenant_id, tx_type, name, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [tenantId, body.tx_type, body.name, body.enabled, body.notes, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

const SubcategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  notes: z.string().min(1),
});

router.post("/finance/subcategories", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = SubcategorySchema.parse(req.body);

    // ensure category belongs to tenant
    const cat = await getPool().query(`SELECT id FROM finance_categories WHERE tenant_id=$1 AND id=$2`, [tenantId, body.category_id]);
    if (!cat.rows[0]) throw new HttpError(400, "Invalid category_id");

    const { rows } = await getPool().query(
      `INSERT INTO finance_subcategories(tenant_id, category_id, name, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [tenantId, body.category_id, body.name, body.enabled, body.notes, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Asset item types
const AssetItemTypeSchema = z.object({
  name: z.string().min(1),
  icon_key: z.string().optional(),
  reorder_threshold: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  notes: z.string().min(1),
});

router.get("/asset-item-types", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN"]), async (req, res, next) => {
  try {
    const { rows } = await getPool().query(`SELECT * FROM asset_item_types WHERE tenant_id=$1 ORDER BY name ASC`, [req.tenantId!]);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/asset-item-types", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = AssetItemTypeSchema.parse(req.body);
    const { rows } = await getPool().query(
      `INSERT INTO asset_item_types(tenant_id, name, icon_key, reorder_threshold, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [tenantId, body.name, body.icon_key || "", body.reorder_threshold, body.enabled, body.notes, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Support routing rules
const RoutingSchema = z.object({
  category: z.enum(["RIDER_VEHICLE","RIDER_CLIENT","RIDER_ACCOUNTS"]),
  primary_user_id: z.string().uuid().optional(),
  secondary_user_id: z.string().uuid().optional(),
  enabled: z.boolean().default(true),
  notes: z.string().min(1),
});

router.put("/support-routing", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = RoutingSchema.parse(req.body);

    const { rows } = await getPool().query(
      `INSERT INTO support_routing_rules(tenant_id, category, primary_user_id, secondary_user_id, enabled, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, category)
       DO UPDATE SET primary_user_id=EXCLUDED.primary_user_id, secondary_user_id=EXCLUDED.secondary_user_id, enabled=EXCLUDED.enabled, notes=EXCLUDED.notes
       RETURNING *`,
      [tenantId, body.category, body.primary_user_id || null, body.secondary_user_id || null, body.enabled, body.notes, req.user!.id]
    );

    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
