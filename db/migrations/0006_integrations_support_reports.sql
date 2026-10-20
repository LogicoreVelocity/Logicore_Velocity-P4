-- 0006_integrations_support_reports.sql
-- Support module + report/export jobs + notifications

DO $$ BEGIN
  CREATE TYPE support_category AS ENUM ('RIDER_VEHICLE','RIDER_CLIENT','RIDER_ACCOUNTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE support_mode AS ENUM ('CALLBACK','MESSAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE support_status AS ENUM ('OPEN','ASSIGNED','IN_PROGRESS','AWAITING_DRIVER_FEEDBACK','SOLVED','UNSOLVED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS support_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category support_category NOT NULL,
  primary_user_id UUID REFERENCES users(id),
  secondary_user_id UUID REFERENCES users(id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, category)
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  category support_category NOT NULL,
  mode support_mode NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status support_status NOT NULL DEFAULT 'OPEN',
  assigned_user_id UUID REFERENCES users(id),
  scheduled_call_at TIMESTAMPTZ,
  user_viewed_at TIMESTAMPTZ,
  user_marked_solved_at TIMESTAMPTZ,
  driver_feedback_due_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON support_tickets(tenant_id, status, created_at DESC);

-- Support messages / log
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id),
  sender_type TEXT NOT NULL, -- DRIVER|USER|SYSTEM
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Driver feedback prompt (forced after 1 hour)
CREATE TABLE IF NOT EXISTS support_feedback_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  solved BOOLEAN,
  not_solved_reason TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications(user_id, created_at DESC);

-- Reports and exports
CREATE TABLE IF NOT EXISTS report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  format TEXT NOT NULL, -- XLSX | PDF
  status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED|RUNNING|DONE|FAILED
  file_path TEXT,
  error TEXT,
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_tenant_time ON report_jobs(tenant_id, requested_at DESC);
