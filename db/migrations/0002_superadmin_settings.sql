-- 0002_superadmin_settings.sql
-- Super Admin control data (settings, toggles, sheets)

CREATE TABLE IF NOT EXISTS superadmin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Feature toggles (optional convenience table)
CREATE TABLE IF NOT EXISTS feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Google Sheet sources (configured ONLY in Super Admin control panel)
CREATE TABLE IF NOT EXISTS sheet_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  mapping_json JSONB NOT NULL, -- column mapping + metadata
  scope JSONB NOT NULL DEFAULT '{}'::jsonb, -- project/client scopes etc
  schedule_minutes INT NOT NULL DEFAULT 180, -- every 3 hours
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheet_sources_tenant ON sheet_sources(tenant_id);

-- Import job logs (for sheets and CSV)
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- SHEET | CSV | XLSX | MANUAL
  source_ref TEXT,           -- sheet_source_id, filename, etc
  data_type TEXT NOT NULL,   -- PERFORMANCE | PAYABLE | RECEIVABLE | ONBOARDING | ...
  status TEXT NOT NULL,      -- SUCCESS | FAILED | PARTIAL
  rows_total INT NOT NULL DEFAULT 0,
  rows_success INT NOT NULL DEFAULT 0,
  rows_failed INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant_time ON import_jobs(tenant_id, created_at DESC);

-- Asset item types (Helmet, T-shirt, etc) configurable by Super Admin (and delegated permissions)
CREATE TABLE IF NOT EXISTS asset_item_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- Helmet, T Shirt, etc
  icon_key TEXT NOT NULL DEFAULT '', -- optional icon identifier for UI
  reorder_threshold INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
