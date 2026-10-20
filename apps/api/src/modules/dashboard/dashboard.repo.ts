import { getPool } from "../../shared/db";

export async function readDashboardSummary(tenantId: string) {
  const pool = getPool();

  const [
    employees,
    employeeStatuses,
    clients,
    assignments,
    vehicles,
    vehicleStatuses,
    approvals,
    finance,
    integrations,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM drivers WHERE tenant_id=$1`, [tenantId]),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM drivers
       WHERE tenant_id=$1
       GROUP BY status
       ORDER BY status`,
      [tenantId]
    ),
    pool.query(
      `SELECT
         COUNT(DISTINCT c.id)::int AS total,
         COUNT(DISTINCT a.id)::int AS active_riders
       FROM clients c
       LEFT JOIN projects p ON p.tenant_id=c.tenant_id AND p.client_id=c.id
       LEFT JOIN assignments a ON a.tenant_id=c.tenant_id AND a.project_id=p.id AND a.status='ACTIVE' AND a.end_date IS NULL
       WHERE c.tenant_id=$1`,
      [tenantId]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='ACTIVE' AND end_date IS NULL)::int AS active,
         COUNT(*) FILTER (WHERE status='ENDED' OR end_date IS NOT NULL)::int AS ended
       FROM assignments
       WHERE tenant_id=$1`,
      [tenantId]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM vehicles WHERE tenant_id=$1`, [tenantId]),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM vehicles
       WHERE tenant_id=$1
       GROUP BY status
       ORDER BY status`,
      [tenantId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS pending
       FROM approval_requests
       WHERE tenant_id=$1 AND status='PENDING'`,
      [tenantId]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE tx_type='PAYABLE' AND status <> 'VOIDED'), 0)::float AS month_payables,
         COALESCE(SUM(amount) FILTER (WHERE tx_type='RECEIVABLE' AND status <> 'VOIDED'), 0)::float AS month_receivables,
         COUNT(*) FILTER (WHERE status='POSTED')::int AS posted_count
       FROM finance_transactions
       WHERE tenant_id=$1
         AND effective_date >= date_trunc('month', CURRENT_DATE)::date`,
      [tenantId]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS sources,
         COUNT(*) FILTER (WHERE last_sync_status='FAILED')::int AS failed
       FROM sheet_sources
       WHERE tenant_id=$1`,
      [tenantId]
    ),
  ]);

  return {
    employees: {
      total: employees.rows[0]?.total || 0,
      by_status: employeeStatuses.rows,
    },
    clients: clients.rows[0] || { total: 0, active_riders: 0 },
    assignments: assignments.rows[0] || { active: 0, ended: 0 },
    vehicles: {
      total: vehicles.rows[0]?.total || 0,
      by_status: vehicleStatuses.rows,
    },
    approvals: approvals.rows[0] || { pending: 0 },
    finance: finance.rows[0] || { month_payables: 0, month_receivables: 0, posted_count: 0 },
    integrations: integrations.rows[0] || { sources: 0, failed: 0 },
  };
}
