-- 0007_visible_core_truth.sql
-- Visible route repair constraints

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_per_driver
  ON assignments(tenant_id, driver_id)
  WHERE status='ACTIVE' AND end_date IS NULL;
