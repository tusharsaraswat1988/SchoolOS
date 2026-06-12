/**
 * Sprint 1 exit demo: post manual charge + payment ledger entries for one student.
 * Usage: pnpm --filter @workspace/api-server run billing:demo
 */
import { config } from "dotenv";
import path from "node:path";
import { db, studentsTable } from "@workspace/db";
import { postChargeEntry, postPaymentEntry } from "../lib/billing/ledger-service";
import { getStudentBalance } from "../lib/billing/student-balance";

config({ path: path.resolve(import.meta.dirname, "../../../../.env") });

async function main() {
  const [student] = await db.select().from(studentsTable).limit(1);
  if (!student) {
    console.error("No students found — run pnpm db:seed first.");
    process.exit(1);
  }

  const chargeAmount = 5000;
  const paymentAmount = 2000;

  await postChargeEntry(db, {
    societyId: student.societyId,
    schoolId: student.schoolId,
    branchId: student.branchId,
    sessionId: student.sessionId,
    studentId: student.id,
    amount: chargeAmount,
    entryDate: "2025-04-01",
    narration: "Sprint 1 demo charge",
  });

  await postPaymentEntry(db, {
    societyId: student.societyId,
    schoolId: student.schoolId,
    branchId: student.branchId,
    sessionId: student.sessionId,
    studentId: student.id,
    amount: paymentAmount,
    entryDate: "2025-04-18",
    narration: "Sprint 1 demo payment",
  });

  const balance = await getStudentBalance(db, {
    branchId: student.branchId,
    sessionId: student.sessionId,
    studentId: student.id,
  });

  console.log(
    JSON.stringify(
      {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        chargeAmount,
        paymentAmount,
        expectedOutstanding: chargeAmount - paymentAmount,
        balance,
      },
      null,
      2,
    ),
  );

  if (balance.outstanding !== chargeAmount - paymentAmount) {
    console.error("Balance mismatch — expected", chargeAmount - paymentAmount);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
