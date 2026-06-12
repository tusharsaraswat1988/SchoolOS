CREATE TYPE "public"."admission_lead_source" AS ENUM(
  'walk_in',
  'phone_inquiry',
  'website',
  'social_media',
  'referral',
  'camp_event',
  'newspaper',
  'hoarding',
  'agent',
  'existing_parent',
  'other'
);

CREATE TYPE "public"."admission_lead_status" AS ENUM(
  'new',
  'contacted',
  'follow_up',
  'visited',
  'converted',
  'lost'
);

CREATE TYPE "public"."admission_lead_lost_reason" AS ENUM(
  'fee_too_high',
  'joined_other_school',
  'location',
  'timing',
  'no_response',
  'changed_mind',
  'other'
);

CREATE TYPE "public"."admission_lead_contact_method" AS ENUM(
  'call',
  'whatsapp',
  'sms',
  'email',
  'in_person',
  'other'
);

CREATE TABLE IF NOT EXISTS "admission_leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "society_id" integer NOT NULL,
  "school_id" integer NOT NULL,
  "branch_id" integer NOT NULL,
  "session_id" integer NOT NULL,
  "child_name" text NOT NULL,
  "parent_name" text NOT NULL,
  "parent_phone" text NOT NULL,
  "parent_email" text,
  "source" "admission_lead_source" DEFAULT 'other' NOT NULL,
  "source_detail" text,
  "interested_class_id" integer,
  "status" "admission_lead_status" DEFAULT 'new' NOT NULL,
  "initial_inquiry_notes" text,
  "lost_reason" "admission_lead_lost_reason",
  "lost_reason_notes" text,
  "converted_student_id" integer,
  "converted_at" timestamp with time zone,
  "next_follow_up_at" timestamp with time zone,
  "assigned_to_user_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer,
  "updated_by" integer
);

ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_society_id_societies_id_fk" FOREIGN KEY ("society_id") REFERENCES "public"."societies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_interested_class_id_classes_id_fk" FOREIGN KEY ("interested_class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_converted_student_id_students_id_fk" FOREIGN KEY ("converted_student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "admission_leads" ADD CONSTRAINT "admission_leads_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "admission_leads_branch_session_status_idx" ON "admission_leads" USING btree ("branch_id","session_id","status");
CREATE INDEX IF NOT EXISTS "admission_leads_branch_session_source_idx" ON "admission_leads" USING btree ("branch_id","session_id","source");
CREATE INDEX IF NOT EXISTS "admission_leads_next_follow_up_idx" ON "admission_leads" USING btree ("branch_id","next_follow_up_at");

CREATE TABLE IF NOT EXISTS "admission_lead_follow_ups" (
  "id" serial PRIMARY KEY NOT NULL,
  "lead_id" integer NOT NULL,
  "society_id" integer NOT NULL,
  "school_id" integer NOT NULL,
  "branch_id" integer NOT NULL,
  "session_id" integer NOT NULL,
  "contact_method" "admission_lead_contact_method" DEFAULT 'call' NOT NULL,
  "contacted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "discussion_summary" text NOT NULL,
  "their_response" text,
  "next_follow_up_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer
);

ALTER TABLE "admission_lead_follow_ups" ADD CONSTRAINT "admission_lead_follow_ups_lead_id_admission_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."admission_leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_lead_follow_ups" ADD CONSTRAINT "admission_lead_follow_ups_society_id_societies_id_fk" FOREIGN KEY ("society_id") REFERENCES "public"."societies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_lead_follow_ups" ADD CONSTRAINT "admission_lead_follow_ups_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_lead_follow_ups" ADD CONSTRAINT "admission_lead_follow_ups_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "admission_lead_follow_ups" ADD CONSTRAINT "admission_lead_follow_ups_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "admission_lead_follow_ups_lead_contacted_idx" ON "admission_lead_follow_ups" USING btree ("lead_id","contacted_at");
