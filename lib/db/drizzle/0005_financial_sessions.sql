CREATE TABLE IF NOT EXISTS "financial_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "society_id" integer NOT NULL,
  "school_id" integer NOT NULL,
  "branch_id" integer NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "starts_on" date NOT NULL,
  "ends_on" date NOT NULL,
  "is_current" boolean DEFAULT false NOT NULL,
  "status" "entity_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer,
  "updated_by" integer,
  CONSTRAINT "financial_sessions_starts_before_ends_chk" CHECK ("starts_on" < "ends_on")
);

ALTER TABLE "financial_sessions" ADD CONSTRAINT "financial_sessions_society_id_societies_id_fk" FOREIGN KEY ("society_id") REFERENCES "public"."societies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "financial_sessions" ADD CONSTRAINT "financial_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "financial_sessions" ADD CONSTRAINT "financial_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "financial_sessions_branch_code_uq" ON "financial_sessions" USING btree ("branch_id","code");
CREATE INDEX IF NOT EXISTS "financial_sessions_branch_idx" ON "financial_sessions" USING btree ("branch_id");

ALTER TABLE "fee_records" ADD COLUMN IF NOT EXISTS "financial_session_id" integer;
ALTER TABLE "fee_records" ADD CONSTRAINT "fee_records_financial_session_id_financial_sessions_id_fk" FOREIGN KEY ("financial_session_id") REFERENCES "public"."financial_sessions"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "fee_structures" ADD COLUMN IF NOT EXISTS "financial_session_id" integer;
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_financial_session_id_financial_sessions_id_fk" FOREIGN KEY ("financial_session_id") REFERENCES "public"."financial_sessions"("id") ON DELETE cascade ON UPDATE no action;
