import { getPool } from "../shared/db";

/**
 * Not reporting automation (daily).
 *
 * Rule:
 * - Day 3: reminder
 * - Day 5: notify super admin & assigned user; move to IDLE_TEMP
 * - Day 7-14: MISSING_OR_RUNAWAY; user changes only via approval
 * - Day 15+: INACTIVE; only super admin can change
 *
 * This scaffold provides the hook. Implement using driver_activity_daily + driver_flags.
 */
export async function notReportingJob() {
  const pool = getPool();
  // TODO:
  // 1) Find drivers whose last activity_date is N days ago
  // 2) Create notifications and/or driver_flags
  // 3) Enforce transitions by writing driver_status_history + drivers.status
  // 4) Audit every automated change
  await pool.query("SELECT 1");
}
