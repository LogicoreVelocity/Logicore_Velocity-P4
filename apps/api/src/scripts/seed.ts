import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { initDb, getPool } from "../shared/db";

dotenv.config();

async function seed() {
  await initDb();
  const pool = getPool();

  const tenantName = "Logicore Demo";
  const tenantRes = await pool.query(
    `INSERT INTO tenants(name) VALUES ($1) RETURNING *`,
    [tenantName]
  );
  const tenant = tenantRes.rows[0];

  dotenv.config();

async function createUser(role: string, email: string, password: string, displayName: string, driverId?: string) {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users(tenant_id, role, email, password_hash, display_name, driver_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, tenant_id, role, email, display_name`,
      [tenant.id, role, email.toLowerCase(), hash, displayName, driverId || null]
    );
    return rows[0];
  }

  // Create sample driver profile + linked DRIVER user
  const driverRes = await pool.query(
    `INSERT INTO drivers(tenant_id, full_name, phone, visa_type, employee_code_type, employee_code, status, joined_at, notes)
     VALUES ($1,'Demo Driver','+971500000999','OWN_VISA','TEMP','TEMP-000001','ASSIGNED',CURRENT_DATE,'Seed driver')
     RETURNING *`,
    [tenant.id]
  );
  const driver = driverRes.rows[0];

  const superadmin = await createUser("SUPER_ADMIN", "superadmin@logicore.local", "ChangeMe123!", "Super Admin");
  const admin = await createUser("ADMIN", "admin@logicore.local", "ChangeMe123!", "Admin");
  const accounts = await createUser("ACCOUNTS", "accounts@logicore.local", "ChangeMe123!", "Accounts");
  const user = await createUser("USER", "user@logicore.local", "ChangeMe123!", "User");
  const driverUser = await createUser("DRIVER", "driver@logicore.local", "ChangeMe123!", "Driver App User", driver.id);

  // Finance master data
  const catSalary = (await pool.query(
    `INSERT INTO finance_categories(tenant_id, tx_type, name, enabled, notes, created_by, updated_by)
     VALUES ($1,'PAYABLE','SALARY',true,'Seed',$2,$2) RETURNING *`,
    [tenant.id, superadmin.id]
  )).rows[0];

  const catRental = (await pool.query(
    `INSERT INTO finance_categories(tenant_id, tx_type, name, enabled, notes, created_by, updated_by)
     VALUES ($1,'RECEIVABLE','RENTAL',true,'Seed',$2,$2) RETURNING *`,
    [tenant.id, superadmin.id]
  )).rows[0];

  const catFines = (await pool.query(
    `INSERT INTO finance_categories(tenant_id, tx_type, name, enabled, notes, created_by, updated_by)
     VALUES ($1,'RECEIVABLE','FINES',true,'Seed',$2,$2) RETURNING *`,
    [tenant.id, superadmin.id]
  )).rows[0];

  dotenv.config();

async function sub(catId: string, name: string) {
    await pool.query(
      `INSERT INTO finance_subcategories(tenant_id, category_id, name, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,true,'Seed',$4,$4)
       ON CONFLICT DO NOTHING`,
      [tenant.id, catId, name, superadmin.id]
    );
  }

  await sub(catSalary.id, "BASIC");
  await sub(catSalary.id, "ATTENDANCE_BONUS");
  await sub(catSalary.id, "PERFORMANCE_BONUS");

  await sub(catRental.id, "RENTAL_RECEIVABLE");
  await sub(catFines.id, "SPEEDING_FINE");
  await sub(catFines.id, "SALIK");

  // Asset item types
  const items = ["Helmet","T Shirt","Trouser","Safety Gears","Winter Jacket","Cap","Mobile Holder"];
  for (const it of items) {
    await pool.query(
      `INSERT INTO asset_item_types(tenant_id, name, icon_key, reorder_threshold, enabled, notes, created_by, updated_by)
       VALUES ($1,$2,$3,0,true,'Seed',$4,$4)
       ON CONFLICT DO NOTHING`,
      [tenant.id, it, it.toLowerCase().replace(/\s+/g,"_"), superadmin.id]
    );
  }

  // Client + Projects (including driving school project)
  const client = (await pool.query(
    `INSERT INTO clients(tenant_id, name, notes, created_by) VALUES ($1,'Demo Client','Seed',$2) RETURNING *`,
    [tenant.id, superadmin.id]
  )).rows[0];

  await pool.query(
    `INSERT INTO projects(tenant_id, client_id, name, license_required, is_driving_school, notes, created_by)
     VALUES ($1,$2,'Driving School',false,true,'Seed',$3)
     ON CONFLICT DO NOTHING`,
    [tenant.id, client.id, superadmin.id]
  );

  await pool.query(
    `INSERT INTO projects(tenant_id, client_id, name, license_required, is_driving_school, notes, created_by)
     VALUES ($1,$2,'Project A',true,false,'Seed',$3)
     ON CONFLICT DO NOTHING`,
    [tenant.id, client.id, superadmin.id]
  );

  // Support routing (empty by default, you can set via superadmin endpoint)
  await pool.query(
    `INSERT INTO support_routing_rules(tenant_id, category, primary_user_id, secondary_user_id, enabled, notes, created_by)
     VALUES ($1,'RIDER_VEHICLE',$2,NULL,true,'Seed',$2)
     ON CONFLICT DO NOTHING`,
    [tenant.id, admin.id]
  );

  await pool.query(
    `INSERT INTO support_routing_rules(tenant_id, category, primary_user_id, secondary_user_id, enabled, notes, created_by)
     VALUES ($1,'RIDER_CLIENT',$2,NULL,true,'Seed',$2)
     ON CONFLICT DO NOTHING`,
    [tenant.id, user.id]
  );

  await pool.query(
    `INSERT INTO support_routing_rules(tenant_id, category, primary_user_id, secondary_user_id, enabled, notes, created_by)
     VALUES ($1,'RIDER_ACCOUNTS',$2,NULL,true,'Seed',$2)
     ON CONFLICT DO NOTHING`,
    [tenant.id, accounts.id]
  );

  // Default settings
  await pool.query(
    `INSERT INTO superadmin_settings(tenant_id, key, value, notes, updated_by)
     VALUES ($1,'NOT_REPORTING_RULES',$2,'Seed not-reporting thresholds',$3)
     ON CONFLICT DO NOTHING`,
    [tenant.id, JSON.stringify({ day3: true, day5: true, day7_14: true, day15: true }), superadmin.id]
  );

  console.log("\n=== Seed complete ===");
  console.log("tenant_id:", tenant.id);
  console.log("Seeded users (emails):");
  console.log("  SUPER_ADMIN:", superadmin.email);
  console.log("  ADMIN:", admin.email);
  console.log("  ACCOUNTS:", accounts.email);
  console.log("  USER:", user.email);
  console.log("  DRIVER (mobile):", driverUser.email);
  console.log("\nNOTE: Seeded passwords are for local development only. Change them before any production use.");
  console.log("linked driver_id:", driver.id);
  console.log("====================\n");


  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
