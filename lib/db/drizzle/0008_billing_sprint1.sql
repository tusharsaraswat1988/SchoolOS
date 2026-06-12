-- Billing MVP-A Sprint 1: M1–M6, M2b + ledger foundation (ledger_entries)
-- See BILLING_MVP_IMPLEMENTATION_PLAN.md rev.2

-- M1: enums
DO $$ BEGIN
  CREATE TYPE billing_run_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_discount_kind AS ENUM ('fixed', 'percent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_sequence_type AS ENUM ('invoice', 'receipt', 'payment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM ('charge', 'payment', 'discount', 'advance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_direction AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- M2: academic_sessions
ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS default_fee_due_day integer NOT NULL DEFAULT 10;

ALTER TABLE academic_sessions
  ADD COLUMN IF NOT EXISTS prorate_mid_month_admission boolean NOT NULL DEFAULT true;

-- M2b: students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS billing_class_id integer REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS billing_class_effective_from date;

-- M3: fee_structures — dated revisions
ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS effective_to date;

ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS billing_months integer[];

UPDATE fee_structures fs
SET effective_from = s.starts_on
FROM academic_sessions s
WHERE fs.session_id = s.id
  AND fs.effective_from IS NULL;

ALTER TABLE fee_structures
  ALTER COLUMN effective_from SET NOT NULL;

DROP INDEX IF EXISTS fee_structures_class_head_uq;

CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_class_head_effective_uq
  ON fee_structures (session_id, class_id, fee_head_id, effective_from);

-- M4: number_sequences
CREATE TABLE IF NOT EXISTS number_sequences (
  id serial PRIMARY KEY NOT NULL,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer REFERENCES academic_sessions(id) ON DELETE CASCADE,
  sequence_type billing_sequence_type NOT NULL,
  prefix text NOT NULL,
  next_value integer NOT NULL DEFAULT 1,
  padding integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS number_sequences_branch_session_type_uq
  ON number_sequences (branch_id, session_id, sequence_type);

-- M5: billing_runs
CREATE TABLE IF NOT EXISTS billing_runs (
  id serial PRIMARY KEY NOT NULL,
  society_id integer NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  billing_period_label text NOT NULL,
  status billing_run_status NOT NULL DEFAULT 'pending',
  total_students integer NOT NULL DEFAULT 0,
  invoices_created integer NOT NULL DEFAULT 0,
  invoices_skipped integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_runs_branch_session_period_uq
  ON billing_runs (branch_id, session_id, billing_period_start);

CREATE INDEX IF NOT EXISTS billing_runs_branch_session_idx
  ON billing_runs (branch_id, session_id);

-- M6: student_fee_assignments
CREATE TABLE IF NOT EXISTS student_fee_assignments (
  id serial PRIMARY KEY NOT NULL,
  society_id integer NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id integer NOT NULL REFERENCES fee_heads(id) ON DELETE CASCADE,
  override_amount integer,
  discount_kind billing_discount_kind,
  discount_value integer,
  is_excluded boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS student_fee_assignments_student_session_head_from_idx
  ON student_fee_assignments (student_id, session_id, fee_head_id, effective_from);

-- Sprint 1 ledger foundation (supports ledger-service; invoices table deferred to Sprint 2)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id serial PRIMARY KEY NOT NULL,
  society_id integer NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  entry_type ledger_entry_type NOT NULL,
  direction ledger_direction NOT NULL,
  amount integer NOT NULL,
  fee_head_id integer REFERENCES fee_heads(id) ON DELETE SET NULL,
  invoice_id integer,
  invoice_item_id integer,
  payment_id integer,
  reference_entry_id integer REFERENCES ledger_entries(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  narration text NOT NULL,
  is_void boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ledger_entries_branch_student_date_idx
  ON ledger_entries (branch_id, student_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS ledger_entries_branch_session_type_idx
  ON ledger_entries (branch_id, session_id, entry_type);

CREATE INDEX IF NOT EXISTS ledger_entries_payment_idx ON ledger_entries (payment_id);
CREATE INDEX IF NOT EXISTS ledger_entries_invoice_idx ON ledger_entries (invoice_id);

-- M11 (partial): fees.collect permission
INSERT INTO permissions (key, module, action, description, status, created_at, updated_at)
VALUES ('fees.collect', 'fees', 'collect', 'Collect fees at counter', 'active', now(), now())
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, is_allowed, created_at, updated_at)
SELECT r.id, p.id, true, now(), now()
FROM roles r
CROSS JOIN permissions p
WHERE r.key IN ('school_admin', 'accountant')
  AND p.key = 'fees.collect'
ON CONFLICT (role_id, permission_id) DO NOTHING;
