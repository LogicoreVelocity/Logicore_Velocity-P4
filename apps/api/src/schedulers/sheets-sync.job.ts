import { getPool } from "../shared/db";

/**
 * Sheets sync job (every 3 hours).
 *
 * IMPORTANT:
 * - Real Google Sheets reading requires OAuth or service account.
 * - This scaffold logs the run and updates last_sync fields.
 */
export async function sheetsSyncJob() {
  const pool = getPool();
  const sources = await pool.query(`SELECT * FROM sheet_sources WHERE enabled=true`);
  for (const s of sources.rows) {
    await runOneSource(s.tenant_id, s.id, null, "Scheduled sync");
  }
}

export async function runSheetsSyncOnce(tenantId: string, actorUserId: string, notes: string) {
  const pool = getPool();
  const sources = await pool.query(`SELECT * FROM sheet_sources WHERE tenant_id=$1 AND enabled=true`, [tenantId]);
  for (const s of sources.rows) {
    await runOneSource(tenantId, s.id, actorUserId, notes);
  }
}

async function runOneSource(tenantId: string, sheetSourceId: string, actorUserId: string | null, notes: string) {
  const pool = getPool();
  try {
    // TODO: Implement Google Sheets provider:
    // 1) resolve spreadsheet id
    // 2) fetch data
    // 3) map fields using mapping_json
    // 4) upsert into driver_activity_daily (or performance tables)
    // 5) create import_jobs row with accurate counters

    await pool.query(
      `INSERT INTO import_jobs(tenant_id, source_type, source_ref, data_type, status, rows_total, rows_success, rows_failed, error_summary, notes, created_by)
       VALUES ($1,'SHEET',$2,'PERFORMANCE','SUCCESS',0,0,0,NULL,$3,$4)`,
      [tenantId, sheetSourceId, notes, actorUserId]
    );

    await pool.query(
      `UPDATE sheet_sources SET last_sync_at=now(), last_sync_status='SUCCESS', last_sync_error=NULL, updated_at=now()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, sheetSourceId]
    );
  } catch (err: any) {
    await pool.query(
      `UPDATE sheet_sources SET last_sync_at=now(), last_sync_status='FAILED', last_sync_error=$3, updated_at=now()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, sheetSourceId, String(err?.message || err)]
    );

    await pool.query(
      `INSERT INTO import_jobs(tenant_id, source_type, source_ref, data_type, status, rows_total, rows_success, rows_failed, error_summary, notes, created_by)
       VALUES ($1,'SHEET',$2,'PERFORMANCE','FAILED',0,0,0,$3,$4,$5)`,
      [tenantId, sheetSourceId, String(err?.message || err), notes, actorUserId]
    );
  }
}
