import { config as loadDotenv } from "dotenv";
import path from "node:path";

loadDotenv({ path: path.resolve(process.cwd(), "../../.env") });

async function main() {
  const { db, schoolsTable, studentsTable } = await import("./index");
  const { seedDocumentMasterForSchool, syncLegacyParentRelations } = await import(
    "./sync-student-relations"
  );

  const schools = await db.select().from(schoolsTable);
  console.log(`Seeding document master for ${schools.length} school(s)...`);
  for (const school of schools) {
    await seedDocumentMasterForSchool(db, school.societyId, school.id);
  }

  const students = await db.select().from(studentsTable);
  console.log(`Migrating relations for ${students.length} student(s)...`);

  let done = 0;
  for (const student of students) {
    await syncLegacyParentRelations(db, student, {
      societyId: student.societyId,
      schoolId: student.schoolId,
      branchId: student.branchId,
    });
    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${students.length}`);
  }

  console.log(`Student Master V2 migration complete (${done} students).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
