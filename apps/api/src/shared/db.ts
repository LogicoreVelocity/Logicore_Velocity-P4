import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) throw new Error("DB pool not initialized");
  return pool;
}

export async function initDb(): Promise<void> {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL not set");

  pool = new Pool({ connectionString: conn });
  await pool.query("SELECT 1");
  console.log("[DB] Connected");
}
