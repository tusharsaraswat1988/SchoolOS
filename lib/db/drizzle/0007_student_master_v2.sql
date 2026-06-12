-- Student Master V2: normalized relations, documents, siblings, communication preferences

-- Extend student_status enum
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'left';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'tc_issued';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'alumni';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'suspended';

-- New enums
DO $$ BEGIN
  CREATE TYPE relation_type AS ENUM ('father', 'mother', 'guardian', 'local_guardian', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_entity_type AS ENUM ('student', 'staff', 'teacher', 'driver', 'vehicle', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pen_number text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS apaar_id text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS udise_student_id text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_rte_student boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_cwsn_student boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS house text;

CREATE UNIQUE INDEX IF NOT EXISTS students_registration_number_uq ON students (registration_number) WHERE registration_number IS NOT NULL;
