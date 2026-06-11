import { Router } from "express";
import {
  academicSessionsTable,
  attendanceRecordsTable,
  auditLogsTable,
  branchesTable,
  classesTable,
  db,
  feeRecordsTable,
  rolesTable,
  schoolsTable,
  sectionsTable,
  societiesTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { resolveBranchScope, resolveSessionScope } from "../lib/scope";
import { mapAuditEventResponse, mapClassResponse } from "../lib/response-mappers";

const router = Router();

router.get("/platform/dashboard", async (_req, res) => {
  const [
    societyStats,
    schoolStats,
    studentStats,
    teacherStats,
    sessionStats,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(societiesTable),
    db.select({ total: sql<number>`count(*)` }).from(schoolsTable),
    db
      .select({ total: sql<number>`count(*)` })
      .from(studentsTable)
      .where(eq(studentsTable.status, "active")),
    db
      .select({ total: sql<number>`count(*)` })
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(and(eq(rolesTable.key, "teacher"), eq(usersTable.status, "active"))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(academicSessionsTable)
      .where(eq(academicSessionsTable.isCurrent, true)),
  ]);

  return res.json({
    totalSocieties: Number(societyStats[0]?.total ?? 0),
    totalSchools: Number(schoolStats[0]?.total ?? 0),
    totalStudents: Number(studentStats[0]?.total ?? 0),
    totalTeachers: Number(teacherStats[0]?.total ?? 0),
    activeSessions: Number(sessionStats[0]?.total ?? 0),
    totalBranches: Number(
      (
        await db.select({ total: sql<number>`count(*)` }).from(branchesTable)
      )[0]?.total ?? 0,
    ),
    totalUsers: Number(
      (await db.select({ total: sql<number>`count(*)` }).from(usersTable))[0]?.total ?? 0,
    ),
  });
});

router.get("/branches/:branchId/dashboard", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;
  const today = new Date().toISOString().split("T")[0];

  const studentConditions = [eq(studentsTable.branchId, branchId), eq(studentsTable.status, "active")];
  const feeConditions = [eq(feeRecordsTable.branchId, branchId)];
  const attendanceConditions = [
    eq(attendanceRecordsTable.branchId, branchId),
    eq(attendanceRecordsTable.attendanceDate, today),
  ];
  const classConditions = [eq(classesTable.branchId, branchId)];

  if (sessionId) {
    studentConditions.push(eq(studentsTable.sessionId, sessionId));
    feeConditions.push(eq(feeRecordsTable.sessionId, sessionId));
    attendanceConditions.push(eq(attendanceRecordsTable.sessionId, sessionId));
    classConditions.push(eq(classesTable.sessionId, sessionId));
  }

  const [
    studentCountResult,
    staffCountResult,
    feeStats,
    attendanceStats,
    classes,
    recentPayments,
    upcomingBirthdays,
    monthlyFeeData,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(studentsTable)
      .where(and(...studentConditions)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(and(eq(usersTable.branchId, branchId), eq(usersTable.status, "active"))),
    db
      .select({
        totalExpected: sql<number>`sum(${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0))`,
        totalCollected: sql<number>`sum(coalesce(${feeRecordsTable.paidAmount}, 0))`,
        totalPending: sql<number>`sum(case when ${feeRecordsTable.status} in ('pending', 'partial') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
      })
      .from(feeRecordsTable)
      .where(and(...feeConditions)),
    db
      .select({
        status: attendanceRecordsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(attendanceRecordsTable)
      .where(and(...attendanceConditions))
      .groupBy(attendanceRecordsTable.status),
    db
      .select({
        id: classesTable.id,
        code: classesTable.code,
        name: classesTable.name,
        gradeOrder: classesTable.gradeOrder,
        classTeacherUserId: classesTable.classTeacherUserId,
        classTeacherName: usersTable.name,
        branchId: classesTable.branchId,
        sessionId: classesTable.sessionId,
        studentCount: sql<number>`count(distinct ${studentsTable.id})`,
        sectionCount: sql<number>`count(distinct ${sectionsTable.id})`,
      })
      .from(classesTable)
      .leftJoin(usersTable, eq(classesTable.classTeacherUserId, usersTable.id))
      .leftJoin(
        studentsTable,
        and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active")),
      )
      .leftJoin(sectionsTable, eq(sectionsTable.classId, classesTable.id))
      .where(and(...classConditions))
      .groupBy(classesTable.id, usersTable.name)
      .limit(10),
    db
      .select({
        id: feeRecordsTable.id,
        studentId: feeRecordsTable.studentId,
        studentName: sql<string>`concat(${studentsTable.firstName}, ' ', ${studentsTable.lastName})`,
        admissionNumber: studentsTable.admissionNumber,
        className: classesTable.name,
        feeType: feeRecordsTable.feeType,
        amount: feeRecordsTable.amount,
        paidAmount: feeRecordsTable.paidAmount,
        discount: feeRecordsTable.discount,
        status: feeRecordsTable.status,
        dueDate: feeRecordsTable.dueDate,
        paidDate: feeRecordsTable.paidDate,
        receiptNumber: feeRecordsTable.receiptNumber,
        paymentMethod: feeRecordsTable.paymentMethod,
        branchId: feeRecordsTable.branchId,
        createdAt: feeRecordsTable.createdAt,
      })
      .from(feeRecordsTable)
      .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(...feeConditions, eq(feeRecordsTable.status, "paid")))
      .orderBy(desc(feeRecordsTable.updatedAt))
      .limit(5),
    db
      .select({
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        dob: studentsTable.dob,
        className: classesTable.name,
      })
      .from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(...studentConditions))
      .limit(5),
    db
      .select({
        month: sql<string>`to_char(coalesce(${feeRecordsTable.paidDate}, ${feeRecordsTable.dueDate})::date, 'Mon')`,
        sortKey: sql<string>`to_char(coalesce(${feeRecordsTable.paidDate}, ${feeRecordsTable.dueDate})::date, 'YYYY-MM')`,
        collected: sql<number>`sum(case when ${feeRecordsTable.status} = 'paid' then coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
        pending: sql<number>`sum(case when ${feeRecordsTable.status} in ('pending', 'partial', 'overdue') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
      })
      .from(feeRecordsTable)
      .where(and(...feeConditions))
      .groupBy(
        sql`to_char(coalesce(${feeRecordsTable.paidDate}, ${feeRecordsTable.dueDate})::date, 'Mon'), to_char(coalesce(${feeRecordsTable.paidDate}, ${feeRecordsTable.dueDate})::date, 'YYYY-MM')`,
      )
      .orderBy(
        sql`to_char(coalesce(${feeRecordsTable.paidDate}, ${feeRecordsTable.dueDate})::date, 'YYYY-MM')`,
      )
      .limit(6),
  ]);

  const totalStudents = Number(studentCountResult[0]?.count ?? 0);
  const totalStaff = Number(staffCountResult[0]?.count ?? 0);
  const present = Number(attendanceStats.find((s) => s.status === "present")?.count ?? 0);
  const absent = Number(attendanceStats.find((s) => s.status === "absent")?.count ?? 0);
  const late = Number(attendanceStats.find((s) => s.status === "late")?.count ?? 0);
  const totalFeeExpected = Number(feeStats[0]?.totalExpected ?? 0);
  const totalFeeCollected = Number(feeStats[0]?.totalCollected ?? 0);
  const pendingFees = Number(feeStats[0]?.totalPending ?? 0);

  return res.json({
    studentCount: totalStudents,
    staffCount: totalStaff,
    attendanceRate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
    feeCollectionRate: totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 0,
    pendingFees,
    totalFeeExpected,
    totalFeeCollected,
    recentPayments,
    todayAttendance: {
      totalStudents,
      avgAttendanceRate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      byClass: [],
    },
    classBreakdown: classes.map(mapClassResponse),
    monthlyFeeChart: monthlyFeeData.map((m) => ({
      month: m.month ?? "Unknown",
      collected: Number(m.collected ?? 0),
      pending: Number(m.pending ?? 0),
    })),
    upcomingBirthdays: upcomingBirthdays.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      date: s.dob ?? "",
      className: s.className ?? "Unknown",
    })),
  });
});

router.get("/societies/:societyId/dashboard", async (req, res) => {
  const societyId = Number(req.params.societyId);

  const [schools, schoolStats, branchStats] = await Promise.all([
    db
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.societyId, societyId))
      .orderBy(desc(schoolsTable.createdAt))
      .limit(5),
    db
      .select({
        totalSchools: sql<number>`count(*)`,
        activeSchools: sql<number>`sum(case when ${schoolsTable.status} = 'active' then 1 else 0 end)`,
      })
      .from(schoolsTable)
      .where(eq(schoolsTable.societyId, societyId)),
    db
      .select({
        totalBranches: sql<number>`count(*)`,
        activeBranches: sql<number>`sum(case when ${branchesTable.status} = 'active' then 1 else 0 end)`,
      })
      .from(branchesTable)
      .where(eq(branchesTable.societyId, societyId)),
  ]);

  const [studentStats] = await db
    .select({ totalStudents: sql<number>`count(*)` })
    .from(studentsTable)
    .where(eq(studentsTable.societyId, societyId));

  const s = schoolStats[0];
  const b = branchStats[0];

  return res.json({
    totalSchools: Number(s.totalSchools ?? 0),
    activeSchools: Number(s.activeSchools ?? 0),
    totalBranches: Number(b.totalBranches ?? 0),
    activeBranches: Number(b.activeBranches ?? 0),
    totalStudents: Number(studentStats.totalStudents ?? 0),
    totalRevenue: 0,
    recentSchools: schools,
    monthlyGrowth: [],
  });
});

router.get("/branches/:branchId/audit-events", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const limit = Number(req.query.limit) || 10;

  const events = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.branchId, branchId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  return res.json(events.map(mapAuditEventResponse));
});

export default router;
