-- 0008_python_import_pipeline.sql
-- Persist validated previews and allocate employee codes atomically.

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'COMMITTED',
  ADD COLUMN IF NOT EXISTS file_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS preview_rows JSONB,
  ADD COLUMN IF NOT EXISTS preview_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant_stage_time
  ON import_jobs(tenant_id, stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_jobs_preview_expiry
  ON import_jobs(preview_expires_at)
  WHERE stage = 'PREVIEWED';

CREATE TABLE IF NOT EXISTS tenant_employee_code_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code_type employee_code_type NOT NULL,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, code_type)
);

INSERT INTO tenant_employee_code_counters(tenant_id, code_type, last_value)
SELECT
  tenant_id,
  employee_code_type,
  MAX(COALESCE(NULLIF(substring(employee_code FROM '([0-9]+)$'), '')::BIGINT, 0))
FROM drivers
GROUP BY tenant_id, employee_code_type
ON CONFLICT (tenant_id, code_type) DO UPDATE
SET last_value = GREATEST(tenant_employee_code_counters.last_value, EXCLUDED.last_value),
    updated_at = now();

CREATE OR REPLACE FUNCTION next_employee_code(
  p_tenant_id UUID,
  p_code_type employee_code_type
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  INSERT INTO tenant_employee_code_counters(tenant_id, code_type, last_value)
  VALUES (p_tenant_id, p_code_type, 1)
  ON CONFLICT (tenant_id, code_type) DO UPDATE
  SET last_value = tenant_employee_code_counters.last_value + 1,
      updated_at = now()
  RETURNING last_value INTO next_value;

  RETURN p_code_type::TEXT || '-' || lpad(next_value::TEXT, 6, '0');
END;
$$;
