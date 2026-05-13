import { Router } from "express";
import { db, feeRecordsTable, studentsTable, classesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreateFeeRecordBody, RecordFeePaymentBody } from "@workspace/api-zod";

const router = Router();

const feeWithStudent = (schoolId: number) =>
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
      schoolId: feeRecordsTable.schoolId,
      createdAt: feeRecordsTable.createdAt,
    })
    .from(feeRecordsTable)
    .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(feeRecordsTable.schoolId, schoolId));

router.get("/schools/:schoolId/fees", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
  const status = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(feeRecordsTable.schoolId, schoolId)];
  if (studentId) conditions.push(eq(feeRecordsTable.studentId, studentId));
  if (status) conditions.push(eq(feeRecordsTable.status, status as any));

  const [records, countResult] = await Promise.all([
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
        schoolId: feeRecordsTable.schoolId,
        createdAt: feeRecordsTable.createdAt,
      })
      .from(feeRecordsTable)
      .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(feeRecordsTable).where(and(...conditions)),
  ]);

  return res.json({ data: records, total: Number(countResult[0].count), page, limit });
});

router.post("/schools/:schoolId/fees", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateFeeRecordBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [record] = await db
    .insert(feeRecordsTable)
    .values({ ...parsed.data, schoolId, amount: String(parsed.data.amount), discount: parsed.data.discount ? String(parsed.data.discount) : "0" })
    .returning();

  const [withStudent] = await feeWithStudent(schoolId).where(eq(feeRecordsTable.id, record.id)).limit(1);
  return res.status(201).json(withStudent);
});

router.post("/schools/:schoolId/fees/:feeId/pay", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const feeId = Number(req.params.feeId);
  const parsed = RecordFeePaymentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [existing] = await db
    .select()
    .from(feeRecordsTable)
    .where(and(eq(feeRecordsTable.id, feeId), eq(feeRecordsTable.schoolId, schoolId)))
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Fee record not found" });

  const totalAmount = Number(existing.amount) - Number(existing.discount ?? 0);
  const newPaid = Number(existing.paidAmount ?? 0) + parsed.data.amount;
  const newStatus = newPaid >= totalAmount ? "paid" : newPaid > 0 ? "partial" : "pending";
  const receiptNumber = newStatus === "paid" ? `RCP-${Date.now()}` : existing.receiptNumber;

  const [updated] = await db
    .update(feeRecordsTable)
    .set({
      paidAmount: String(newPaid),
      status: newStatus,
      paidDate: newStatus === "paid" ? new Date().toISOString().split("T")[0] : existing.paidDate,
      receiptNumber,
      paymentMethod: parsed.data.paymentMethod as any,
    })
    .where(eq(feeRecordsTable.id, feeId))
    .returning();

  const [withStudent] = await feeWithStudent(schoolId).where(eq(feeRecordsTable.id, feeId)).limit(1);
  return res.json(withStudent);
});

router.get("/schools/:schoolId/fees/summary", async (req, res) => {
  const schoolId = Number(req.params.schoolId);

  const [stats, recent] = await Promise.all([
    db
      .select({
        totalExpected: sql<number>`sum(${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0))`,
        totalCollected: sql<number>`sum(coalesce(${feeRecordsTable.paidAmount}, 0))`,
        totalPending: sql<number>`sum(case when ${feeRecordsTable.status} = 'pending' then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) else 0 end)`,
        totalOverdue: sql<number>`sum(case when ${feeRecordsTable.status} = 'overdue' then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) else 0 end)`,
      })
      .from(feeRecordsTable)
      .where(eq(feeRecordsTable.schoolId, schoolId)),
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
        schoolId: feeRecordsTable.schoolId,
        createdAt: feeRecordsTable.createdAt,
      })
      .from(feeRecordsTable)
      .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(eq(feeRecordsTable.schoolId, schoolId), eq(feeRecordsTable.status, "paid")))
      .orderBy(sql`${feeRecordsTable.paidDate} desc`)
      .limit(5),
  ]);

  const s = stats[0];
  const expected = Number(s.totalExpected ?? 0);
  const collected = Number(s.totalCollected ?? 0);

  return res.json({
    totalExpected: expected,
    totalCollected: collected,
    totalPending: Number(s.totalPending ?? 0),
    totalOverdue: Number(s.totalOverdue ?? 0),
    collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
    recentPayments: recent,
  });
});

export default router;
