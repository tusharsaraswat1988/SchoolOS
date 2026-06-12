import {
  academicSessionsTable,
  billingSettingsTable,
  branchesTable,
  classesTable,
  feeHeadsTable,
  invoiceItemsTable,
  invoicesTable,
  invoiceTemplatesTable,
  numberSequencesTable,
  schoolsTable,
  schoolProfilesTable,
  sectionsTable,
  studentsTable,
} from "@workspace/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import { createDefaultBillbookLayout, type InvoiceLayoutConfig } from "./invoice-layout";
import { buildBillbookDocument } from "./invoice-renderer";
import { postChargeEntry } from "./ledger-service";
import { nextSequenceNumber } from "./number-sequence";
import { resolveFeeLinesForStudent } from "./pricing-resolver";

type Db = NodePgDatabase<typeof schema>;

export type GenerateInvoiceInput = {
  branchId: number;
  sessionId: number;
  studentId: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billingPeriodLabel: string;
  dueDate: string;
  createdBy?: number | null;
  billingRunId?: number | null;
};

export async function loadInvoiceLayoutForSession(db: Db, branchId: number, sessionId: number) {
  const [settings] = await db
    .select()
    .from(billingSettingsTable)
    .where(
      and(eq(billingSettingsTable.branchId, branchId), eq(billingSettingsTable.sessionId, sessionId)),
    )
    .limit(1);

  let template = settings?.invoiceTemplateId
    ? (
        await db
          .select()
          .from(invoiceTemplatesTable)
          .where(eq(invoiceTemplatesTable.id, settings.invoiceTemplateId))
          .limit(1)
      )[0]
    : undefined;

  if (!template) {
    [template] = await db
      .select()
      .from(invoiceTemplatesTable)
      .where(
        and(
          eq(invoiceTemplatesTable.branchId, branchId),
          isNull(invoiceTemplatesTable.sessionId),
          eq(invoiceTemplatesTable.isDefault, true),
        ),
      )
      .limit(1);
  }

  const defaultLayout = createDefaultBillbookLayout();
  if (!template) {
    return {
      templateId: null as number | null,
      title: defaultLayout.title,
      layout: defaultLayout as InvoiceLayoutConfig,
      settings: settings ?? null,
    };
  }

  return {
    templateId: template.id,
    title: template.title,
    layout: template.layoutConfig as InvoiceLayoutConfig,
    settings: settings ?? null,
  };
}

export async function generateInvoiceForStudent(db: Db, input: GenerateInvoiceInput) {
  const idempotencyKey = `${input.branchId}:${input.sessionId}:${input.studentId}:${input.billingPeriodStart}`;

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.branchId, input.branchId),
        eq(invoicesTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (existing) {
    return { invoice: existing, skipped: true as const };
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, input.studentId))
    .limit(1);
  if (!student) throw new Error("Student not found");

  const lines = await resolveFeeLinesForStudent(db, {
    branchId: input.branchId,
    sessionId: input.sessionId,
    studentId: input.studentId,
    billingPeriodStart: input.billingPeriodStart,
    billingPeriodEnd: input.billingPeriodEnd,
    billingPeriodLabel: input.billingPeriodLabel,
  });

  if (lines.length === 0) {
    throw new Error("No fee lines resolved for this student and billing period");
  }

  const totalGross = lines.reduce((sum, line) => sum + line.grossAmount, 0);
  const totalDiscount = lines.reduce((sum, line) => sum + line.discountAmount, 0);
  const totalNet = lines.reduce((sum, line) => sum + line.netAmount, 0);

  const invoiceNumber = await nextSequenceNumber(db, {
    branchId: input.branchId,
    sessionId: input.sessionId,
    sequenceType: "invoice",
  });

  const layoutBundle = await loadInvoiceLayoutForSession(db, input.branchId, input.sessionId);

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoicesTable)
      .values({
        societyId: student.societyId,
        schoolId: student.schoolId,
        branchId: input.branchId,
        sessionId: input.sessionId,
        studentId: input.studentId,
        invoiceNumber,
        billingPeriodStart: input.billingPeriodStart,
        billingPeriodEnd: input.billingPeriodEnd,
        billingPeriodLabel: input.billingPeriodLabel,
        dueDate: input.dueDate,
        status: "published",
        totalGross,
        totalDiscount,
        totalNet,
        totalPaid: 0,
        billingRunId: input.billingRunId ?? null,
        invoiceTemplateId: layoutBundle.templateId,
        idempotencyKey,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    const itemRows = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      const [item] = await tx
        .insert(invoiceItemsTable)
        .values({
          invoiceId: invoice.id,
          feeHeadId: line.feeHeadId,
          description: line.description,
          grossAmount: line.grossAmount,
          discountAmount: line.discountAmount,
          discountKind: line.discountKind,
          netAmount: line.netAmount,
          paidAmount: 0,
          feeStructureId: line.feeStructureId,
          studentFeeAssignmentId: line.studentFeeAssignmentId,
          sortOrder: i,
        })
        .returning();
      itemRows.push(item);

      await postChargeEntry(tx as unknown as Db, {
        societyId: student.societyId,
        schoolId: student.schoolId,
        branchId: input.branchId,
        sessionId: input.sessionId,
        studentId: input.studentId,
        amount: line.netAmount,
        feeHeadId: line.feeHeadId,
        invoiceId: invoice.id,
        invoiceItemId: item.id,
        entryDate: input.billingPeriodStart,
        narration: line.description,
        createdBy: input.createdBy ?? null,
      });
    }

    const billbook = await buildBillbookSnapshot(tx as unknown as Db, invoice.id);
    const [updated] = await tx
      .update(invoicesTable)
      .set({ billbookSnapshot: billbook })
      .where(eq(invoicesTable.id, invoice.id))
      .returning();

    return { invoice: updated, items: itemRows, skipped: false as const, billbook };
  });
}

export async function buildBillbookSnapshot(db: Db, invoiceId: number) {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice not found");

  const items = await db
    .select({
      description: invoiceItemsTable.description,
      grossAmount: invoiceItemsTable.grossAmount,
      discountAmount: invoiceItemsTable.discountAmount,
      discountKind: invoiceItemsTable.discountKind,
      netAmount: invoiceItemsTable.netAmount,
      paidAmount: invoiceItemsTable.paidAmount,
      headCode: feeHeadsTable.code,
      headName: feeHeadsTable.name,
    })
    .from(invoiceItemsTable)
    .innerJoin(feeHeadsTable, eq(invoiceItemsTable.feeHeadId, feeHeadsTable.id))
    .where(eq(invoiceItemsTable.invoiceId, invoiceId))
    .orderBy(asc(invoiceItemsTable.sortOrder));

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, invoice.studentId))
    .limit(1);

  const [session] = await db
    .select()
    .from(academicSessionsTable)
    .where(eq(academicSessionsTable.id, invoice.sessionId))
    .limit(1);

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, invoice.branchId)).limit(1);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, invoice.schoolId)).limit(1);
  const [profile] = await db
    .select()
    .from(schoolProfilesTable)
    .where(eq(schoolProfilesTable.schoolId, invoice.schoolId))
    .limit(1);

  const [classRow] = student
    ? await db.select().from(classesTable).where(eq(classesTable.id, student.classId)).limit(1)
    : [undefined];
  const [sectionRow] = student
    ? await db.select().from(sectionsTable).where(eq(sectionsTable.id, student.sectionId)).limit(1)
    : [undefined];

  const layoutBundle = await loadInvoiceLayoutForSession(db, invoice.branchId, invoice.sessionId);

  const [sequence] = await db
    .select({ prefix: numberSequencesTable.prefix })
    .from(numberSequencesTable)
    .where(
      and(
        eq(numberSequencesTable.branchId, invoice.branchId),
        eq(numberSequencesTable.sessionId, invoice.sessionId),
        eq(numberSequencesTable.sequenceType, "invoice"),
      ),
    )
    .limit(1);

  const settings = layoutBundle.settings;
  const doc = buildBillbookDocument({
    title: layoutBundle.title,
    layout: layoutBundle.layout,
    headerData: {
      school_name: school?.name ?? null,
      branch_name: branch?.name ?? null,
      school_address: profile?.address ?? null,
      affiliation_board: profile?.affiliationBoardName ?? profile?.affiliationBoard ?? null,
      affiliation_number: profile?.affiliationNumber ?? null,
      school_mobile: profile?.mobile ?? null,
      school_email: profile?.email ?? null,
      invoice_number: invoice.invoiceNumber,
      invoice_prefix: settings?.invoicePrefix ?? sequence?.prefix ?? null,
      session_name: session?.name ?? null,
      session_code: session?.code ?? null,
      billing_period: invoice.billingPeriodLabel,
      issue_date: invoice.createdAt.toISOString().slice(0, 10),
      due_date: invoice.dueDate,
      student_name: student ? `${student.firstName} ${student.lastName}`.trim() : null,
      admission_number: student?.admissionNumber ?? null,
      registration_number: student?.registrationNumber ?? null,
      roll_number: student?.rollNumber ?? null,
      class_name: classRow?.name ?? null,
      section_name: sectionRow?.name ?? null,
      father_name: student?.fatherName ?? null,
      mother_name: student?.motherName ?? null,
      guardian_name: student?.guardianName ?? null,
      student_mobile: student?.parentMobile ?? null,
      social_category: student?.socialCategory ?? null,
    },
    lines: items.map((item) => ({
      feeHeadCode: item.headCode,
      feeHeadName: item.headName,
      description: item.description,
      billingMonth: invoice.billingPeriodLabel,
      grossAmount: item.grossAmount,
      discountAmount: item.discountAmount,
      discountKind: item.discountKind,
      netAmount: item.netAmount,
      paidAmount: item.paidAmount,
    })),
    summary: {
      subtotalGross: invoice.totalGross,
      totalDiscount: invoice.totalDiscount,
      totalNet: invoice.totalNet,
      totalPaid: invoice.totalPaid,
      balanceDue: invoice.totalNet - invoice.totalPaid,
      advanceCredit: 0,
      previousBalance: 0,
    },
    footerData: {
      payment_instructions: settings?.paymentInstructions ?? null,
      bank_name: settings?.bankName ?? null,
      bank_account: settings?.bankAccount ?? null,
      bank_ifsc: settings?.bankIfsc ?? null,
      upi_id: settings?.upiId ?? null,
      footer_notes: settings?.footerNotes ?? null,
      terms_and_conditions: settings?.termsAndConditions ?? null,
      authorized_signatory: settings?.authorizedSignatory ?? null,
      generated_at: new Date().toISOString(),
    },
  });

  return doc as unknown as Record<string, unknown>;
}
