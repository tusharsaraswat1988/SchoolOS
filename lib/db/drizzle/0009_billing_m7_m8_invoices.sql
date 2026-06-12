-- Billing MVP-A M7-M8: invoices, invoice_items, billbook templates, settings, ledger FKs
-- See BILLING_MVP_IMPLEMENTATION_PLAN.md rev.2

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('published', 'partially_paid', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Billbook invoice templates (header / middle / footer layout)
CREATE TABLE IF NOT EXISTS invoice_templates (
  id serial PRIMARY KEY NOT NULL,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer REFERENCES academic_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT 'FEE BILL / CHALLAN',
  layout_config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_templates_branch_session_name_uq
  ON invoice_templates (branch_id, session_id, name);

CREATE INDEX IF NOT EXISTS invoice_templates_branch_idx ON invoice_templates (branch_id);

-- Per-session invoicing settings (prefix, bank, footer overrides)
CREATE TABLE IF NOT EXISTS billing_settings (
  id serial PRIMARY KEY NOT NULL,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  invoice_template_id integer REFERENCES invoice_templates(id) ON DELETE SET NULL,
  invoice_prefix text,
  payment_instructions text,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  upi_id text,
  footer_notes text,
  terms_and_conditions text,
  authorized_signatory text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_settings_branch_session_uq
  ON billing_settings (branch_id, session_id);

-- M7: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id serial PRIMARY KEY NOT NULL,
  society_id integer NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  financial_session_id integer REFERENCES financial_sessions(id) ON DELETE SET NULL,
  student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  billing_period_label text NOT NULL,
  due_date date NOT NULL,
  status invoice_status NOT NULL DEFAULT 'published',
  total_gross integer NOT NULL,
  total_discount integer NOT NULL DEFAULT 0,
  total_net integer NOT NULL,
  total_paid integer NOT NULL DEFAULT 0,
  billing_run_id integer REFERENCES billing_runs(id) ON DELETE SET NULL,
  invoice_template_id integer REFERENCES invoice_templates(id) ON DELETE SET NULL,
  billbook_snapshot jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS invoices_branch_session_student_idx
  ON invoices (branch_id, session_id, student_id);

CREATE INDEX IF NOT EXISTS invoices_branch_session_status_due_idx
  ON invoices (branch_id, session_id, status, due_date);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_branch_idempotency_uq
  ON invoices (branch_id, idempotency_key);

-- M7: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id serial PRIMARY KEY NOT NULL,
  invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_head_id integer NOT NULL REFERENCES fee_heads(id) ON DELETE RESTRICT,
  description text NOT NULL,
  gross_amount integer NOT NULL,
  discount_amount integer NOT NULL DEFAULT 0,
  discount_kind text,
  net_amount integer NOT NULL,
  paid_amount integer NOT NULL DEFAULT 0,
  fee_structure_id integer REFERENCES fee_structures(id) ON DELETE SET NULL,
  student_fee_assignment_id integer REFERENCES student_fee_assignments(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_items_fee_head_idx ON invoice_items (fee_head_id);

-- M8: wire ledger_entries to invoices (table exists from Sprint 1)
DO $$ BEGIN
  ALTER TABLE ledger_entries
    ADD CONSTRAINT ledger_entries_invoice_id_fk
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ledger_entries
    ADD CONSTRAINT ledger_entries_invoice_item_id_fk
    FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default billbook template per branch (session-agnostic default)
INSERT INTO invoice_templates (branch_id, session_id, name, is_default, title, layout_config)
SELECT
  b.id,
  NULL,
  'Default Billbook',
  true,
  'FEE BILL / CHALLAN',
  '{
    "header": {
      "fields": [
        "school_name", "branch_name", "school_address", "affiliation_board",
        "invoice_title", "invoice_number", "invoice_prefix", "session_name",
        "billing_period", "issue_date", "due_date", "student_name",
        "admission_number", "roll_number", "class_name", "section_name",
        "father_name", "student_mobile"
      ],
      "showLogo": true,
      "customLines": []
    },
    "middle": {
      "columns": [
        "serial", "fee_head_code", "fee_head_name", "description", "billing_month",
        "gross_amount", "discount_amount", "discount_kind", "net_amount", "remarks"
      ],
      "summaryRows": [
        "subtotal_gross", "total_discount", "total_net", "total_paid",
        "balance_due", "advance_credit", "amount_in_words"
      ],
      "showAmountInWords": true,
      "groupByFeeHead": false
    },
    "footer": {
      "fields": [
        "payment_instructions", "bank_name", "bank_account", "bank_ifsc", "upi_id",
        "footer_notes", "terms_and_conditions", "authorized_signatory",
        "parent_signature", "generated_at"
      ],
      "showSignatureBlocks": true
    }
  }'::jsonb
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_templates t
  WHERE t.branch_id = b.id AND t.session_id IS NULL AND t.name = 'Default Billbook'
);

-- Seed billing_settings row per active session linking default template
INSERT INTO billing_settings (branch_id, session_id, invoice_template_id, payment_instructions, footer_notes)
SELECT
  s.branch_id,
  s.id,
  t.id,
  'Fees may be paid by cash, UPI, or cheque at the school fee counter during working hours.',
  'Fees once paid are non-refundable. Please preserve this bill for your records.'
FROM academic_sessions s
JOIN invoice_templates t
  ON t.branch_id = s.branch_id AND t.session_id IS NULL AND t.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM billing_settings bs
  WHERE bs.branch_id = s.branch_id AND bs.session_id = s.id
);

-- Seed invoice number sequences where missing
INSERT INTO number_sequences (branch_id, session_id, sequence_type, prefix, next_value, padding)
SELECT s.branch_id, s.id, 'invoice', 'INV-' || REPLACE(s.code, '-', '') || '-', 1, 4
FROM academic_sessions s
WHERE NOT EXISTS (
  SELECT 1 FROM number_sequences ns
  WHERE ns.branch_id = s.branch_id AND ns.session_id = s.id AND ns.sequence_type = 'invoice'
);
