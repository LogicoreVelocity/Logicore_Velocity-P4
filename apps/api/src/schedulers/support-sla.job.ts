import { getPool } from "../shared/db";

/**
 * Support SLA tick (every 5 minutes).
 *
 * Rule:
 * - if callback scheduled and time passed -> remind user
 * - if message viewed -> after 1 hour prompt driver solved/not solved
 *
 * Scaffold hook: implement prompt generation into support_feedback_prompts + notifications.
 */
export async function supportSlaJob() {
  const pool = getPool();

  // TODO: find tickets where user_marked_solved_at set and driver_feedback_due_at reached but no driver feedback
  // - insert support_feedback_prompts
  // - notify driver
  await pool.query("SELECT 1");
}
