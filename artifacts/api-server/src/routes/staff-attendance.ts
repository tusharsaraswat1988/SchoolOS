import { Router } from "express";
import {
  attendanceMonthlySummariesTable,
  db,
  staffAttendanceRecordsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { MarkStaffAttendanceBody } from "../lib/udise-schemas";
import { resolveBranchScope } from "../lib/scope";
import { toPgDate } from "../lib/db-values";

const router = Router();

router.get("/branches/:branchId/staff-attendance", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(staffAttendanceRecordsTable)
    .where(
      and(
        eq(staffAttendanceRecordsTable.branchId, branchId),
        eq(staffAttendanceRecordsTable.attendanceDate, date),
      ),
    );

  return res.json({ data: rows, total: rows.length, date });
});

router.post("/branches/:branchId/staff-attendance", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const parsed = MarkStaffAttendanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const attendanceDate = toPgDate(parsed.data.date)!;

  for (const record of parsed.data.records) {
    await db
      .insert(staffAttendanceRecordsTable)
      .values({
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
        userId: record.userId,
        attendanceDate,
        status: record.status,
        note: record.note,
      })
      .onConflictDoUpdate({
        target: [staffAttendanceRecordsTable.userId, staffAttendanceRecordsTable.attendanceDate],
        set: { status: record.status, note: record.note, updatedAt: new Date() },
      });
  }

  return res.json({ message: "Staff attendance saved", count: parsed.data.records.length });
});

router.get("/branches/:branchId/attendance/monthly", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;

  const conditions = [
    eq(attendanceMonthlySummariesTable.branchId, branchId),
    eq(attendanceMonthlySummariesTable.month, month),
    eq(attendanceMonthlySummariesTable.year, year),
  ];
  if (sessionId) conditions.push(eq(attendanceMonthlySummariesTable.sessionId, sessionId));

  const rows = await db
    .select()
    .from(attendanceMonthlySummariesTable)
    .where(and(...conditions));

  return res.json({ data: rows, total: rows.length, month, year });
});

export default router;
