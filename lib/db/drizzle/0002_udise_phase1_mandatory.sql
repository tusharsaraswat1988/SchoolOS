-- UDISE Phase-1: enforce mandatory parent email on students
UPDATE students SET parent_email = 'unknown@schoolos.local' WHERE parent_email IS NULL OR parent_email = '';
ALTER TABLE students ALTER COLUMN parent_email SET NOT NULL;
