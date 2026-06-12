import { and, desc, eq, lte, or, isNull, gte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  feeHeadsTable,
  feeStructuresTable,
  studentFeeAssignmentsTable,
  studentsTable,
} from "@workspace/db/schema";
import type * as schema from "@workspace/db/schema";

type Db = NodePgDatabase<typeof schema>;

export type ResolvedFeeLine = {
  feeHeadId: number;
  feeHeadCode: string;
  feeHeadName: string;
  feeStructureId: number;
  studentFeeAssignmentId: number | null;
  grossAmount: number;
  discountAmount: number;
  discountKind: string | null;
  netAmount: number;
  description: string;
  isExcluded: boolean;
};

export async function resolveBillingClassId(
  db: Db,
  studentId: number,
  billingPeriodStart: string,
): Promise<number | null> {
  const [student] = await db
    .select({
      classId: studentsTable.classId,
      billingClassId: studentsTable.billingClassId,
      billingClassEffectiveFrom: studentsTable.billingClassEffectiveFrom,
    })
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);

  if (!student) return null;
  if (
    student.billingClassId &&
    student.billingClassEffectiveFrom &&
    student.billingClassEffectiveFrom <= billingPeriodStart
  ) {
    return student.billingClassId;
  }
  return student.classId;
}

/** Resolve applicable fee structure rows for a student + billing period. */
export async function resolveFeeLinesForStudent(
  db: Db,
  input: {
    branchId: number;
    sessionId: number;
    studentId: number;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    billingPeriodLabel: string;
  },
): Promise<ResolvedFeeLine[]> {
  const classId = await resolveBillingClassId(db, input.studentId, input.billingPeriodStart);
  if (!classId) return [];

  const structures = await db
    .select({
      id: feeStructuresTable.id,
      feeHeadId: feeStructuresTable.feeHeadId,
      amount: feeStructuresTable.amount,
      effectiveFrom: feeStructuresTable.effectiveFrom,
      billingMonths: feeStructuresTable.billingMonths,
      headCode: feeHeadsTable.code,
      headName: feeHeadsTable.name,
    })
    .from(feeStructuresTable)
    .innerJoin(feeHeadsTable, eq(feeStructuresTable.feeHeadId, feeHeadsTable.id))
    .where(
      and(
        eq(feeStructuresTable.branchId, input.branchId),
        eq(feeStructuresTable.sessionId, input.sessionId),
        eq(feeStructuresTable.classId, classId),
        lte(feeStructuresTable.effectiveFrom, input.billingPeriodEnd),
        or(
          isNull(feeStructuresTable.effectiveTo),
          gte(feeStructuresTable.effectiveTo, input.billingPeriodStart),
        ),
      ),
    )
    .orderBy(desc(feeStructuresTable.effectiveFrom));

  const latestByHead = new Map<number, (typeof structures)[number]>();
  for (const row of structures) {
    if (!latestByHead.has(row.feeHeadId)) latestByHead.set(row.feeHeadId, row);
  }

  const assignments = await db
    .select()
    .from(studentFeeAssignmentsTable)
    .where(
      and(
        eq(studentFeeAssignmentsTable.studentId, input.studentId),
        eq(studentFeeAssignmentsTable.sessionId, input.sessionId),
        lte(studentFeeAssignmentsTable.effectiveFrom, input.billingPeriodEnd),
        or(
          isNull(studentFeeAssignmentsTable.effectiveTo),
          gte(studentFeeAssignmentsTable.effectiveTo, input.billingPeriodStart),
        ),
      ),
    )
    .orderBy(desc(studentFeeAssignmentsTable.effectiveFrom));

  const assignmentByHead = new Map<number, (typeof assignments)[number]>();
  for (const row of assignments) {
    if (!assignmentByHead.has(row.feeHeadId)) assignmentByHead.set(row.feeHeadId, row);
  }

  const periodMonth = new Date(input.billingPeriodStart).getMonth() + 1;
  const lines: ResolvedFeeLine[] = [];

  for (const structure of latestByHead.values()) {
    if (structure.billingMonths?.length && !structure.billingMonths.includes(periodMonth)) {
      continue;
    }

    const assignment = assignmentByHead.get(structure.feeHeadId);
    if (assignment?.isExcluded) {
      lines.push({
        feeHeadId: structure.feeHeadId,
        feeHeadCode: structure.headCode,
        feeHeadName: structure.headName,
        feeStructureId: structure.id,
        studentFeeAssignmentId: assignment.id,
        grossAmount: 0,
        discountAmount: 0,
        discountKind: null,
        netAmount: 0,
        description: `${input.billingPeriodLabel} — ${structure.headName} (excluded)`,
        isExcluded: true,
      });
      continue;
    }

    let grossAmount = structure.amount;
    let discountAmount = 0;
    let discountKind: string | null = null;

    if (assignment?.overrideAmount != null) {
      grossAmount = assignment.overrideAmount;
    }

    if (assignment?.discountKind && assignment.discountValue != null) {
      discountKind = assignment.discountKind;
      if (assignment.discountKind === "fixed") {
        discountAmount = assignment.discountValue;
      } else if (assignment.discountKind === "percent") {
        discountAmount = Math.round((grossAmount * assignment.discountValue) / 100);
      }
    }

    const netAmount = Math.max(0, grossAmount - discountAmount);
    if (netAmount === 0 && !assignment?.isExcluded) continue;

    lines.push({
      feeHeadId: structure.feeHeadId,
      feeHeadCode: structure.headCode,
      feeHeadName: structure.headName,
      feeStructureId: structure.id,
      studentFeeAssignmentId: assignment?.id ?? null,
      grossAmount,
      discountAmount,
      discountKind,
      netAmount,
      description: `${input.billingPeriodLabel} — ${structure.headName}`,
      isExcluded: false,
    });
  }

  return lines.filter((line) => !line.isExcluded && line.netAmount > 0);
}
