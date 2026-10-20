import { getPool } from "../../shared/db";
import { parseListQuery } from "../../shared/pagination";

export async function listTransactions(params: {
  tenantId: string;
  query: any;
}) {
  const { tenantId, query } = params;
  const { limit, offset, search, sort, filters } = parseListQuery(query);

  const [sortField, sortDir] = sort.split(":");
  const allowedSort = new Set(["created_at","updated_at","effective_date","amount","status"]);
  const sf = allowedSort.has(sortField) ? sortField : "effective_date";
  const sd = sortDir?.toLowerCase() === "asc" ? "ASC" : "DESC";

  const values: any[] = [tenantId];
  let where = `WHERE tenant_id=$1`;

  if (filters.tx_type) {
    values.push(filters.tx_type);
    where += ` AND tx_type=$${values.length}`;
  }
  if (filters.status) {
    values.push(filters.status);
    where += ` AND status=$${values.length}`;
  }
  if (filters.driver_id) {
    values.push(filters.driver_id);
    where += ` AND driver_id=$${values.length}`;
  }

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    where += ` AND (LOWER(notes) LIKE $${values.length} OR LOWER(external_ref) LIKE $${values.length})`;
  }

  const totalRes = await getPool().query(`SELECT COUNT(*)::int AS total FROM finance_transactions ${where}`, values);
  values.push(limit, offset);

  const dataRes = await getPool().query(
    `SELECT * FROM finance_transactions ${where} ORDER BY ${sf} ${sd} LIMIT $${values.length-1} OFFSET $${values.length}`,
    values
  );

  return { total: totalRes.rows[0].total, data: dataRes.rows };
}

export async function listCategories(tenantId: string, txType?: string) {
  const values: any[] = [tenantId];
  let where = "WHERE tenant_id=$1";
  if (txType) {
    values.push(txType);
    where += ` AND tx_type=$${values.length}`;
  }
  const { rows } = await getPool().query(
    `SELECT * FROM finance_categories ${where} ORDER BY name ASC`,
    values
  );
  return rows;
}

export async function listSubcategories(tenantId: string, categoryId: string) {
  const { rows } = await getPool().query(
    `SELECT * FROM finance_subcategories WHERE tenant_id=$1 AND category_id=$2 ORDER BY name ASC`,
    [tenantId, categoryId]
  );
  return rows;
}
