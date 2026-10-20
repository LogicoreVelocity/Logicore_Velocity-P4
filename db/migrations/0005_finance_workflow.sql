-- 0005_finance_workflow.sql
-- Finance categories/subcategories, transactions, approvals, edit requests, payslips, EMI

CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  tx_type finance_tx_type NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tx_type, name)
);

CREATE TABLE IF NOT EXISTS finance_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fin_subcats_category ON finance_subcategories(category_id);

-- Finance transactions
DO $$ BEGIN
  CREATE TYPE finance_tx_status AS ENUM ('PENDING','APPROVED','REJECTED','POSTED','VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  tx_type finance_tx_type NOT NULL,
  category_id UUID REFERENCES finance_categories(id),
  subcategory_id UUID REFERENCES finance_subcategories(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'AED',
  effective_date DATE NOT NULL,
  status finance_tx_status NOT NULL DEFAULT 'PENDING',
  external_ref TEXT, -- fine ticket no, salik ref, etc
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_driver_date ON finance_transactions(driver_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_tx_tenant_type_date ON finance_transactions(tenant_id, tx_type, effective_date DESC);

-- Approvals (generic)
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- FINANCE_TX, FINANCE_EDIT, SALARY_HIKE, DISCOUNT, EMI, DRIVER_STATUS_CHANGE, etc
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- CREATE, EDIT, DELETE, OVERRIDE, etc
  status approval_status NOT NULL DEFAULT 'PENDING',
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  notes TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_status ON approval_requests(tenant_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_no INT NOT NULL,
  required_role user_role,
  decision approval_status,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE(approval_request_id, step_no)
);

-- Edit requests (for transactions)
CREATE TABLE IF NOT EXISTS finance_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES finance_transactions(id) ON DELETE CASCADE,
  proposed_changes JSONB NOT NULL,
  status approval_status NOT NULL DEFAULT 'PENDING',
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NOT NULL
);

-- EMI plans (fine installments)
CREATE TABLE IF NOT EXISTS emi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  original_tx_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  months INT NOT NULL CHECK (months >= 1),
  monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount >= 0),
  start_month DATE NOT NULL,
  end_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payslips (for driver mobile app view)
CREATE TABLE IF NOT EXISTS payslip_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  period_id UUID REFERENCES payslip_periods(id) ON DELETE CASCADE,
  total_payables NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_receivables NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, driver_id, period_id)
);

CREATE TABLE IF NOT EXISTS payslip_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
  tx_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  line_type finance_tx_type NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
