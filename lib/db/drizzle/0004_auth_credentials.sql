-- Phase 1.5: credential-based login (user_code + password_hash)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_id" integer;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_student_id_students_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_user_code_uq" ON "users" ("user_code");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_student_id_idx" ON "users" ("student_id");
