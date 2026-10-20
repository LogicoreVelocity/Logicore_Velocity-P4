import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { initDb, getPool } from "../shared/db";

dotenv.config();

async function run() {
  await initDb();
  const pool = getPool();

  const migrationsPath = path.resolve(process.cwd(), "../../db/migrations");
  const files = fs.readdirSync(migrationsPath)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("[MIGRATIONS] Found:", files);

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsPath, f), "utf-8");
    console.log(`[MIGRATIONS] Running ${f}...`);
    await pool.query(sql);
  }

  console.log("[MIGRATIONS] Done");
  process.exit(0);
}

run().catch((err) => {
  console.error("[MIGRATIONS] Failed:", err);
  process.exit(1);
});
