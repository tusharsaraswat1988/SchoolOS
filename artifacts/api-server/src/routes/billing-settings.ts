import { Router } from "express";
import {
  academicSessionsTable,
  billingSettingsTable,
  db,
  invoiceTemplatesTable,
  numberSequencesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  INVOICE_FOOTER_FIELDS,
  INVOICE_HEADER_FIELDS,
  INVOICE_MIDDLE_COLUMNS,
  INVOICE_MIDDLE_SUMMARY_ROWS,
  createDefaultBillbookLayout,
  type InvoiceLayoutConfig,
} from "../lib/billing/invoice-layout";
import { loadInvoiceLayoutForSession } from "../lib/billing/invoice-generator";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

const layoutConfigSchema = z.object({
  header: z.object({
    fields: z.array(z.string()),
    showLogo: z.boolean().optional(),
    customLines: z.array(z.string()).optional(),
  }),
  middle: z.object({
    columns: z.array(z.string()),
    summaryRows: z.array(z.string()),
    showAmountInWords: z.boolean().optional(),
    groupByFeeHead: z.boolean().optional(),
  }),
  footer: z.object({
    fields: z.array(z.string()),
    showSignatureBlocks: z.boolean().optional(),
  }),
});

router.get("/branches/:branchId/sessions/:sessionId/billing-settings", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const [session] = await db
    .select()
    .from(academicSessionsTable)
    .where(eq(academicSessionsTable.id, sessionId))
    .limit(1);

  const [settings] = await db
    .select()
    .from(billingSettingsTable)
    .where(
      and(eq(billingSettingsTable.branchId, branchId), eq(billingSettingsTable.sessionId, sessionId)),
    )
    .limit(1);

  const layoutBundle = await loadInvoiceLayoutForSession(db, branchId, sessionId);

  const [invoiceSequence] = await db
    .select()
    .from(numberSequencesTable)
    .where(
      and(
        eq(numberSequencesTable.branchId, branchId),
        eq(numberSequencesTable.sessionId, sessionId),
        eq(numberSequencesTable.sequenceType, "invoice"),
      ),
    )
    .limit(1);

  const templates = await db
    .select()
    .from(invoiceTemplatesTable)
    .where(eq(invoiceTemplatesTable.branchId, branchId));

  return res.json({
    session: {
      defaultFeeDueDay: session?.defaultFeeDueDay ?? 10,
      prorateMidMonthAdmission: session?.prorateMidMonthAdmission ?? true,
    },
    settings: settings ?? null,
    activeTemplate: layoutBundle,
    invoiceSequence: invoiceSequence ?? null,
    templates,
    fieldCatalog: {
      header: INVOICE_HEADER_FIELDS,
      middleColumns: INVOICE_MIDDLE_COLUMNS,
      middleSummary: INVOICE_MIDDLE_SUMMARY_ROWS,
      footer: INVOICE_FOOTER_FIELDS,
    },
    readiness: {
      hasTemplate: templates.length > 0,
      hasInvoiceSequence: Boolean(invoiceSequence),
    },
  });
});

const patchSettingsSchema = z.object({
  invoiceTemplateId: z.number().int().positive().nullable().optional(),
  invoicePrefix: z.string().max(40).nullable().optional(),
  paymentInstructions: z.string().max(2000).nullable().optional(),
  bankName: z.string().max(120).nullable().optional(),
  bankAccount: z.string().max(60).nullable().optional(),
  bankIfsc: z.string().max(20).nullable().optional(),
  upiId: z.string().max(80).nullable().optional(),
  footerNotes: z.string().max(2000).nullable().optional(),
  termsAndConditions: z.string().max(4000).nullable().optional(),
  authorizedSignatory: z.string().max(120).nullable().optional(),
  defaultFeeDueDay: z.number().int().min(1).max(28).optional(),
  prorateMidMonthAdmission: z.boolean().optional(),
});

router.patch("/branches/:branchId/sessions/:sessionId/billing-settings", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = patchSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });

  const { defaultFeeDueDay, prorateMidMonthAdmission, ...settingsPatch } = parsed.data;

  if (defaultFeeDueDay != null || prorateMidMonthAdmission != null) {
    await db
      .update(academicSessionsTable)
      .set({
        ...(defaultFeeDueDay != null ? { defaultFeeDueDay } : {}),
        ...(prorateMidMonthAdmission != null ? { prorateMidMonthAdmission } : {}),
      })
      .where(eq(academicSessionsTable.id, sessionId));
  }

  const [existing] = await db
    .select()
    .from(billingSettingsTable)
    .where(
      and(eq(billingSettingsTable.branchId, branchId), eq(billingSettingsTable.sessionId, sessionId)),
    )
    .limit(1);

  let settingsRow = existing;
  if (existing) {
    [settingsRow] = await db
      .update(billingSettingsTable)
      .set(settingsPatch)
      .where(eq(billingSettingsTable.id, existing.id))
      .returning();
  } else if (Object.keys(settingsPatch).length > 0) {
    [settingsRow] = await db
      .insert(billingSettingsTable)
      .values({
        branchId,
        sessionId,
        ...settingsPatch,
      })
      .returning();
  }

  return res.json({ settings: settingsRow ?? null });
});

router.get("/branches/:branchId/invoice-templates", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const rows = await db
    .select()
    .from(invoiceTemplatesTable)
    .where(eq(invoiceTemplatesTable.branchId, branchId));
  return res.json({ data: rows, total: rows.length });
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  sessionId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  layoutConfig: layoutConfigSchema.optional(),
});

router.post("/branches/:branchId/invoice-templates", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const layout: InvoiceLayoutConfig =
    (parsed.data.layoutConfig as InvoiceLayoutConfig | undefined) ?? createDefaultBillbookLayout();

  if (parsed.data.isDefault) {
    await db
      .update(invoiceTemplatesTable)
      .set({ isDefault: false })
      .where(and(eq(invoiceTemplatesTable.branchId, branchId)));
  }

  const [row] = await db
    .insert(invoiceTemplatesTable)
    .values({
      branchId,
      sessionId: parsed.data.sessionId ?? null,
      name: parsed.data.name,
      title: parsed.data.title ?? "FEE BILL / CHALLAN",
      isDefault: parsed.data.isDefault ?? false,
      layoutConfig: layout,
    })
    .returning();

  return res.status(201).json(row);
});

router.patch("/branches/:branchId/invoice-templates/:templateId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const templateId = Number(req.params.templateId);
  const parsed = createTemplateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  if (parsed.data.isDefault) {
    await db
      .update(invoiceTemplatesTable)
      .set({ isDefault: false })
      .where(eq(invoiceTemplatesTable.branchId, branchId));
  }

  const [row] = await db
    .update(invoiceTemplatesTable)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.layoutConfig ? { layoutConfig: parsed.data.layoutConfig } : {}),
      ...(parsed.data.isDefault != null ? { isDefault: parsed.data.isDefault } : {}),
      ...(parsed.data.sessionId !== undefined ? { sessionId: parsed.data.sessionId ?? null } : {}),
    })
    .where(
      and(eq(invoiceTemplatesTable.id, templateId), eq(invoiceTemplatesTable.branchId, branchId)),
    )
    .returning();

  if (!row) return res.status(404).json({ error: "Template not found" });
  return res.json(row);
});

export default router;
