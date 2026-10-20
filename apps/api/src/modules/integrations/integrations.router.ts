import { Router } from "express";
import { requireRole } from "../../shared/rbac";
import { runSheetsSyncOnce } from "../../schedulers/sheets-sync.job";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";

const router = Router();

router.post("/sheets/sync-now", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const notes = String(req.body?.notes || "").trim();
    if (!notes) throw new HttpError(400, "notes is required");

    await runSheetsSyncOnce(req.tenantId!, req.user!.id, notes);
    res.json({ ok: true, message: "Sheets sync triggered (stub fetch unless you implement Google Sheets provider)" });
  } catch (err) { next(err); }
});

router.get("/sheets/status", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN"]), async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, name, enabled, schedule_minutes, last_sync_at, last_sync_status, last_sync_error
       FROM sheet_sources WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [req.tenantId!]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post("/fines-salik/import", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS"]), async (req, res, next) => {
  try {
    const notes = String(req.body?.notes || "").trim();
    if (!notes) throw new HttpError(400, "notes is required");

    // TODO: implement legal automation / portal download steps only if you have official rights/consent.
    await audit(req, {
      action: "FINES_SALIK_IMPORT_REQUESTED",
      entity_type: "INTEGRATION",
      entity_id: "FINES_SALIK",
      notes,
      after_json: { mode: "manual_bulk_recommended" }
    });

    res.json({
      ok: true,
      message: "Scaffold: implement manual bulk import via receivables template or official API integration when available."
    });
  } catch (err) { next(err); }
});

export default router;
