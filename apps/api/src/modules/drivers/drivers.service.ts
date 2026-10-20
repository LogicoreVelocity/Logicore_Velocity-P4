import { getPool } from "../../shared/db";

export type DriverStatus =
  | "ONBOARDING"
  | "IDLE_NEW_JOINING"
  | "ASSIGNED"
  | "UNASSIGNING"
  | "VACATION"
  | "IDLE_POST_VACATION"
  | "IDLE_TEMP"
  | "MISSING_OR_RUNAWAY"
  | "INACTIVE"
  | "OFFBOARDING"
  | "CANCELLED";

const transitions: Record<DriverStatus, DriverStatus[]> = {
  ONBOARDING: ["IDLE_NEW_JOINING"],
  IDLE_NEW_JOINING: ["ASSIGNED"],
  ASSIGNED: ["UNASSIGNING", "VACATION", "IDLE_TEMP", "OFFBOARDING"],
  UNASSIGNING: ["IDLE_TEMP", "VACATION", "OFFBOARDING", "ASSIGNED"],
  VACATION: ["IDLE_POST_VACATION", "OFFBOARDING"],
  IDLE_POST_VACATION: ["ASSIGNED", "IDLE_TEMP"],
  IDLE_TEMP: ["ASSIGNED", "OFFBOARDING", "INACTIVE"],
  MISSING_OR_RUNAWAY: ["IDLE_TEMP", "INACTIVE", "OFFBOARDING"],
  INACTIVE: ["IDLE_TEMP", "OFFBOARDING"],
  OFFBOARDING: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransition(from: DriverStatus, to: DriverStatus): boolean {
  return (transitions[from] || []).includes(to);
}

export async function generateEmployeeCode(tenantId: string, type: "CWDS" | "TEMP") {
  const { rows } = await getPool().query(
    `SELECT next_employee_code($1, $2::employee_code_type) AS employee_code`,
    [tenantId, type]
  );
  return rows[0].employee_code as string;
}

export async function listDrivers(params: {
  tenantId: string;
  limit: number;
  offset: number;
  search: string;
  sort: string;
}) {
  const { tenantId, limit, offset, search, sort } = params;

  const [sortField, sortDir] = sort.split(":");
  const allowedSort = new Set(["created_at","updated_at","full_name","status","employee_code"]);
  const sf = allowedSort.has(sortField) ? sortField : "updated_at";
  const sd = sortDir?.toLowerCase() === "asc" ? "ASC" : "DESC";

  const values: any[] = [tenantId];
  let where = `WHERE tenant_id=$1`;
  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    where += ` AND (LOWER(full_name) LIKE $${values.length} OR LOWER(phone) LIKE $${values.length} OR LOWER(employee_code) LIKE $${values.length})`;
  }

  const totalRes = await getPool().query(`SELECT COUNT(*)::int AS total FROM drivers ${where}`, values);
  values.push(limit, offset);

  const dataRes = await getPool().query(
    `SELECT * FROM drivers ${where} ORDER BY ${sf} ${sd} LIMIT $${values.length-1} OFFSET $${values.length}`,
    values
  );

  return { total: totalRes.rows[0].total, data: dataRes.rows };
}

export async function getDriver(tenantId: string, driverId: string) {
  const { rows } = await getPool().query(
    `SELECT * FROM drivers WHERE tenant_id=$1 AND id=$2`,
    [tenantId, driverId]
  );
  return rows[0] || null;
}

export async function getDriverTimeline(tenantId: string, driverId: string) {
  const history = await getPool().query(
    `SELECT * FROM driver_status_history WHERE tenant_id=$1 AND driver_id=$2 ORDER BY effective_at DESC LIMIT 200`,
    [tenantId, driverId]
  );
  const assignments = await getPool().query(
    `SELECT a.*, p.name AS project_name FROM assignments a
     JOIN projects p ON p.id=a.project_id
     WHERE a.tenant_id=$1 AND a.driver_id=$2 ORDER BY a.start_date DESC LIMIT 200`,
    [tenantId, driverId]
  );
  const assets = await getPool().query(
    `SELECT * FROM asset_assignments WHERE tenant_id=$1 AND driver_id=$2 ORDER BY assigned_at DESC LIMIT 200`,
    [tenantId, driverId]
  );
  const txs = await getPool().query(
    `SELECT * FROM finance_transactions WHERE tenant_id=$1 AND driver_id=$2 ORDER BY effective_date DESC LIMIT 200`,
    [tenantId, driverId]
  );

  return {
    status_history: history.rows,
    assignments: assignments.rows,
    asset_assignments: assets.rows,
    transactions: txs.rows,
  };
}
