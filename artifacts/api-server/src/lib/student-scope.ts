import { db, studentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveSessionScope } from "./scope";

export async function getStudentInSession(
  branchId: number,
  sessionId: number,
  studentId: number,
) {
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return null;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        eq(studentsTable.id, studentId),
        eq(studentsTable.branchId, branchId),
        eq(studentsTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  return student ?? null;
}

export function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function generateRegistrationNumber(branchId: number): string {
  const year = new Date().getFullYear();
  const seq = Date.now().toString(36).toUpperCase().slice(-6);
  return `REG-${year}-${branchId}-${seq}`;
}

export function canonicalSiblingPair(idA: number, idB: number): [number, number] {
  return idA < idB ? [idA, idB] : [idB, idA];
}
