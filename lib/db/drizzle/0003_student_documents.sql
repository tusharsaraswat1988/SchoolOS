CREATE TYPE "student_document_type" AS ENUM (
  'student_photo',
  'birth_certificate',
  'aadhaar',
  'transfer_certificate',
  'other'
);

CREATE TABLE "student_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE cascade,
  "document_type" "student_document_type" NOT NULL,
  "label" text,
  "public_id" text NOT NULL,
  "secure_url" text,
  "file_name" text,
  "mime_type" text,
  "resource_type" text DEFAULT 'auto' NOT NULL,
  "bytes" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" integer,
  "updated_by" integer
);

CREATE UNIQUE INDEX "student_documents_public_id_uq" ON "student_documents" ("public_id");
CREATE INDEX "student_documents_student_idx" ON "student_documents" ("student_id");
