import { getPool } from "../../shared/db";

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

export async function listAssignments(tenantId: string, status?: string) {
  const values: any[] = [tenantId];
  let where = "WHERE a.tenant_id=$1";

  if (status) {
    values.push(status);
    where += ` AND a.status=$${values.length}`;
  }

  const { rows } = await getPool().query(
    `SELECT
       a.*,
       d.full_name AS employee_name,
       d.employee_code,
       d.status AS employee_status,
       p.name AS project_name,
       p.license_required,
       p.is_driving_school,
       c.name AS client_name
     FROM assignments a
     JOIN drivers d ON d.tenant_id=a.tenant_id AND d.id=a.driver_id
     JOIN projects p ON p.tenant_id=a.tenant_id AND p.id=a.project_id
     LEFT JOIN clients c ON c.tenant_id=a.tenant_id AND c.id=p.client_id
     ${where}
     ORDER BY COALESCE(a.end_date, a.start_date) DESC, a.created_at DESC
     LIMIT 500`,
    values
  );

  return rows;
}

export async function readDriverForUpdate(db: Queryable, tenantId: string, driverId: string) {
  const { rows } = await db.query(
    `SELECT * FROM drivers WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
    [tenantId, driverId]
  );
  return rows[0] || null;
}

export async function readProject(db: Queryable, tenantId: string, projectId: string) {
  const { rows } = await db.query(
    `SELECT p.*, c.name AS client_name
     FROM projects p
     LEFT JOIN clients c ON c.tenant_id=p.tenant_id AND c.id=p.client_id
     WHERE p.tenant_id=$1 AND p.id=$2`,
    [tenantId, projectId]
  );
  return rows[0] || null;
}

export async function readActiveAssignment(db: Queryable, tenantId: string, driverId: string, excludeId?: string) {
  const values: any[] = [tenantId, driverId];
  let where = "tenant_id=$1 AND driver_id=$2 AND status='ACTIVE' AND end_date IS NULL";
  if (excludeId) {
    values.push(excludeId);
    where += ` AND id<>$${values.length}`;
  }

  const { rows } = await db.query(
    `SELECT * FROM assignments WHERE ${where} LIMIT 1`,
    values
  );
  return rows[0] || null;
}

export async function insertAssignment(db: Queryable, params: {
  tenantId: string;
  driverId: string;
  projectId: string;
  clientProjectId?: string;
  salaryMode: "FIXED" | "PER_ORDER";
  fixedBasic?: number;
  fixedAttendanceBonus?: number;
  fixedPerformanceBonus?: number;
  perOrderRate?: number;
  rentalReceivableDefault?: number;
  startDate: string;
  notes: string;
  actorId: string;
}) {
  const { rows } = await db.query(
    `INSERT INTO assignments(
       tenant_id, driver_id, project_id, client_project_id, salary_mode, fixed_basic,
       fixed_attendance_bonus, fixed_performance_bonus, per_order_rate, rental_receivable_default,
       start_date, status, notes, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ACTIVE',$12,$13,$13)
     RETURNING *`,
    [
      params.tenantId,
      params.driverId,
      params.projectId,
      params.clientProjectId || null,
      params.salaryMode,
      params.fixedBasic ?? null,
      params.fixedAttendanceBonus ?? null,
      params.fixedPerformanceBonus ?? null,
      params.perOrderRate ?? null,
      params.rentalReceivableDefault ?? null,
      params.startDate,
      params.notes,
      params.actorId,
    ]
  );
  return rows[0];
}

export async function readAssignmentForUpdate(db: Queryable, tenantId: string, assignmentId: string) {
  const { rows } = await db.query(
    `SELECT * FROM assignments WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
    [tenantId, assignmentId]
  );
  return rows[0] || null;
}
