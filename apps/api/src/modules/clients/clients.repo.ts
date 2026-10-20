import { getPool } from "../../shared/db";

export async function listClients(tenantId: string, search = "") {
  const values: any[] = [tenantId];
  let where = "WHERE c.tenant_id=$1";

  if (search.trim()) {
    values.push(`%${search.trim().toLowerCase()}%`);
    where += ` AND LOWER(c.name) LIKE $${values.length}`;
  }

  const { rows } = await getPool().query(
    `SELECT
       c.id,
       c.tenant_id,
       c.name,
       c.notes,
       c.created_by,
       c.created_at,
       COUNT(DISTINCT p.id)::int AS project_count,
       COUNT(DISTINCT a.id)::int AS active_riders
     FROM clients c
     LEFT JOIN projects p ON p.tenant_id=c.tenant_id AND p.client_id=c.id
     LEFT JOIN assignments a ON a.tenant_id=c.tenant_id AND a.project_id=p.id AND a.status='ACTIVE' AND a.end_date IS NULL
     ${where}
     GROUP BY c.id, c.tenant_id, c.name, c.notes, c.created_by, c.created_at
     ORDER BY c.name ASC
     LIMIT 500`,
    values
  );

  return rows;
}

export async function listClientProjects(tenantId: string) {
  const { rows } = await getPool().query(
    `SELECT
       p.id,
       p.tenant_id,
       p.client_id,
       c.name AS client_name,
       p.name,
       p.license_required,
       p.is_driving_school,
       p.notes,
       p.created_by,
       p.created_at,
       COUNT(a.id)::int AS active_riders
     FROM projects p
     LEFT JOIN clients c ON c.tenant_id=p.tenant_id AND c.id=p.client_id
     LEFT JOIN assignments a ON a.tenant_id=p.tenant_id AND a.project_id=p.id AND a.status='ACTIVE' AND a.end_date IS NULL
     WHERE p.tenant_id=$1
     GROUP BY p.id, p.tenant_id, p.client_id, c.name, p.name, p.license_required, p.is_driving_school, p.notes, p.created_by, p.created_at
     ORDER BY c.name ASC NULLS LAST, p.name ASC
     LIMIT 500`,
    [tenantId]
  );

  return rows;
}

export async function getClientById(tenantId: string, clientId: string) {
  const { rows } = await getPool().query(
    `SELECT * FROM clients WHERE tenant_id=$1 AND id=$2`,
    [tenantId, clientId]
  );
  return rows[0] || null;
}

export async function createClient(params: {
  tenantId: string;
  name: string;
  notes: string;
  actorId: string;
}) {
  const { rows } = await getPool().query(
    `INSERT INTO clients(tenant_id, name, notes, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [params.tenantId, params.name, params.notes, params.actorId]
  );
  return rows[0];
}

export async function updateClient(params: {
  tenantId: string;
  clientId: string;
  name?: string;
  notes: string;
}) {
  const { rows } = await getPool().query(
    `UPDATE clients
     SET name=COALESCE($3, name), notes=$4
     WHERE tenant_id=$1 AND id=$2
     RETURNING *`,
    [params.tenantId, params.clientId, params.name || null, params.notes]
  );
  return rows[0] || null;
}
