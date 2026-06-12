import { Router } from "express";
import {
  classesTable,
  academicSessionsTable,
  db,
  invoiceItemsTable,
  invoicesTable,
  studentsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticatedRequest } from "../lib/auth-context";
import {
  buildBillbookSnapshot,
  generateInvoiceForStudent,
} from "../lib/billing/invoice-generator";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/invoices", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
  const status = req.query.status as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const conditions = [
    eq(invoicesTable.branchId, branchId),
    eq(invoicesTable.sessionId, sessionId),
  ];
  if (studentId) conditions.push(eq(invoicesTable.studentId, studentId));
  if (status) conditions.push(eq(invoicesTable.status, status as "published"));

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        studentId: invoicesTable.studentId,
        studentName: sql<string>`concat(${studentsTable.firstName}, ' ', ${studentsTable.lastName})`,
        admissionNumber: studentsTable.admissionNumber,
        className: classesTable.name,
        billingPeriodLabel: invoicesTable.billingPeriodLabel,
        dueDate: invoicesTable.dueDate,
        status: invoicesTable.status,
        totalNet: invoicesTable.totalNet,
        totalPaid: invoicesTable.totalPaid,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .innerJoin(studentsTable, eq(invoicesTable.studentId, studentsTable.id))
      .innerJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(...conditions))
      .orderBy(desc(invoicesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(invoicesTable)
      .where(and(...conditions)),
  ]);

  return res.json({
    data: rows,
    total: Number(countRow[0]?.count ?? 0),
    page,
    limit,
  });
});

router.get("/branches/:branchId/sessions/:sessionId/invoices/:invoiceId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const invoiceId = Number(req.params.invoiceId);

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.branchId, branchId),
        eq(invoicesTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId))
    .orderBy(invoiceItemsTable.sortOrder);

  return res.json({ ...invoice, items });
});

router.get("/branches/:branchId/sessions/:sessionId/invoices/:invoiceId/billbook", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const invoiceId = Number(req.params.invoiceId);

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.branchId, branchId),
        eq(invoicesTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const billbook =
    invoice.billbookSnapshot ?? (await buildBillbookSnapshot(db, invoiceId));

  return res.json({ invoiceId, invoiceNumber: invoice.invoiceNumber, billbook });
});

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/invoices",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const rows = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.branchId, branchId),
          eq(invoicesTable.sessionId, sessionId),
          eq(invoicesTable.studentId, studentId),
        ),
      )
      .orderBy(desc(invoicesTable.billingPeriodStart));

    return res.json({ data: rows, total: rows.length });
  },
);

const generateSchema = z.object({
  billingPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billingPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billingPeriodLabel: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/invoices/generate",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    try {
      const [sessionRow] = await db
        .select({ defaultFeeDueDay: academicSessionsTable.defaultFeeDueDay })
        .from(academicSessionsTable)
        .where(eq(academicSessionsTable.id, sessionId))
        .limit(1);

      const dueDay = sessionRow?.defaultFeeDueDay ?? 10;
      const dueDate =
        parsed.data.dueDate ??
        `${parsed.data.billingPeriodStart.slice(0, 8)}${String(dueDay).padStart(2, "0")}`;

      const auth = isAuthenticatedRequest(req) ? req.auth : null;
      const result = await generateInvoiceForStudent(db, {
        branchId,
        sessionId,
        studentId,
        billingPeriodStart: parsed.data.billingPeriodStart,
        billingPeriodEnd: parsed.data.billingPeriodEnd,
        billingPeriodLabel: parsed.data.billingPeriodLabel,
        dueDate,
        createdBy: auth?.userId ?? null,
      });

      if (result.skipped) {
        return res.status(200).json({ skipped: true, invoice: result.invoice });
      }

      return res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      return res.status(400).json({ error: message });
    }
  },
);

export default router;
