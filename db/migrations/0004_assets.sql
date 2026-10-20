-- 0004_assets.sql
-- Vehicles, Sims, Other Assets, Assignments, Replacements, Removals

DO $$ BEGIN
  CREATE TYPE asset_owner AS ENUM ('CWDS','CLIENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM ('IN_STOCK','ASSIGNED','DAMAGED','UNDER_REPAIR','LOST','REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sim_status AS ENUM ('IN_STOCK','ASSIGNED','LOST','REPLACED','REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE other_asset_status AS ENUM ('IN_STOCK','ASSIGNED','ASSIGNED_ON_LEAVE','DAMAGED','LOST','RETURNED_TO_CWDS','RETURNED_TO_CLIENT','REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_assignment_status AS ENUM ('ACTIVE','ON_LEAVE','RETURNED','RETURNED_TO_CLIENT','REPLACED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  make_model TEXT NOT NULL DEFAULT '',
  year INT,
  -- Branding
  box_installed BOOLEAN NOT NULL DEFAULT FALSE,
  same_brand BOOLEAN NOT NULL DEFAULT FALSE,
  advertisement BOOLEAN NOT NULL DEFAULT FALSE,
  box_installed_from TEXT,
  box_installed_at DATE,
  advertisement_permit_expiry DATE,
  status vehicle_status NOT NULL DEFAULT 'IN_STOCK',
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, plate_number)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_status ON vehicles(tenant_id, status);

CREATE TABLE IF NOT EXISTS vehicle_removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  box_returned BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL,
  removal_date DATE NOT NULL,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIMs
CREATE TABLE IF NOT EXISTS sims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  owner asset_owner NOT NULL DEFAULT 'CWDS',
  pickup_purchase_date DATE,
  status sim_status NOT NULL DEFAULT 'IN_STOCK',
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, card_number)
);

CREATE INDEX IF NOT EXISTS idx_sims_tenant_status ON sims(tenant_id, status);

-- Other assets (uniforms, gear)
CREATE TABLE IF NOT EXISTS other_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  item_type_id UUID REFERENCES asset_item_types(id),
  description TEXT NOT NULL DEFAULT '',
  owner asset_owner NOT NULL DEFAULT 'CWDS',
  purchase_pickup_date DATE,
  status other_asset_status NOT NULL DEFAULT 'IN_STOCK',
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_other_assets_tenant_status ON other_assets(tenant_id, status);

-- Asset assignments (generic link: driver <-> asset)
DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('VEHICLE','SIM','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  asset_id UUID NOT NULL,
  status asset_assignment_status NOT NULL DEFAULT 'ACTIVE',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_driver ON asset_assignments(driver_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_type, asset_id);

-- Replacements (Vehicle/SIM)
CREATE TABLE IF NOT EXISTS asset_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  old_asset_id UUID NOT NULL,
  new_asset_id UUID NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  reissue_same_sim BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_amount NUMERIC(12,2),
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
