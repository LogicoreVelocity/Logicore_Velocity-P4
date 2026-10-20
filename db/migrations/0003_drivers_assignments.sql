-- 0003_drivers_assignments.sql
-- Drivers, lifecycle history, projects, assignments, attendance/activity

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  visa_type visa_type NOT NULL DEFAULT 'OWN_VISA',
  employee_code_type employee_code_type NOT NULL,
  employee_code TEXT NOT NULL, -- unique per tenant
  status driver_status NOT NULL DEFAULT 'ONBOARDING',
  joined_at DATE,
  -- license details (may be null until after driving school)
  license_no TEXT,
  license_issue_date DATE,
  license_expiry_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone),
  UNIQUE(tenant_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_drivers_tenant_status ON drivers(tenant_id, status);


-- Link DRIVER users to driver profile (optional)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN driver_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_users_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS driver_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  from_status driver_status,
  to_status driver_status NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_status_history_driver_time ON driver_status_history(driver_id, effective_at DESC);

-- Projects / clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  license_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_driving_school BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Driver assignments
DO $$ BEGIN
  CREATE TYPE salary_mode AS ENUM ('FIXED','PER_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  client_project_id TEXT, -- project ID provided by client (optional)
  salary_mode salary_mode NOT NULL,
  fixed_basic NUMERIC(12,2),
  fixed_attendance_bonus NUMERIC(12,2),
  fixed_performance_bonus NUMERIC(12,2),
  per_order_rate NUMERIC(12,2),
  rental_receivable_default NUMERIC(12,2), -- e.g., 1100
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | ENDED
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_driver_active ON assignments(driver_id) WHERE end_date IS NULL;

-- Driver activity / attendance (for not-reporting automation)
CREATE TABLE IF NOT EXISTS driver_activity_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  source TEXT NOT NULL, -- SHEET | PORTAL | MANUAL
  check_in_count INT NOT NULL DEFAULT 0,
  deliveries_count INT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, driver_id, activity_date)
);

-- Driver flags (not reporting, missing, etc)
CREATE TABLE IF NOT EXISTS driver_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL, -- NOT_REPORTING, MISSING_OR_RUNAWAY, etc
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, driver_id, flag_key)
);
