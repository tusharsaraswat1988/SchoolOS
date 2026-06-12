import { Router } from "express";
import {
  admissionLeadFollowUpsTable,
  admissionLeadsTable,
  classesTable,
  db,
  insertAdmissionLeadFollowUpSchema,
  insertAdmissionLeadSchema,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

const leadSourceValues = [
  "walk_in",
  "phone_inquiry",
  "website",
  "social_media",
  "referral",
  "camp_event",
  "newspaper",
  "hoarding",
  "agent",
  "existing_parent",
  "other",
] as const;

const leadStatusValues = [
  "new",
  "contacted",
  "follow_up",
  "visited",
  "converted",
  "lost",
] as const;

const lostReasonValues = [
  "fee_too_high",
  "joined_other_school",
  "location",
  "timing",
  "no_response",
  "changed_mind",
  "other",
] as const;

const contactMethodValues = ["call", "whatsapp", "sms", "email", "in_person", "other"] as const;

const CreateLeadBody = z.object({
  childName: z.string().min(1),
  parentName: z.string().min(1),
  parentPhone: z.string().min(1),
  parentEmail: z.string().email().optional().nullable(),
  source: z.enum(leadSourceValues).optional(),
  sourceDetail: z.string().optional().nullable(),
  interestedClassId: z.number().int().positive().optional().nullable(),
  initialInquiryNotes: z.string().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  assignedToUserId: z.number().int().positive().optional().nullable(),
});

const UpdateLeadBody = z.object({
  childName: z.string().min(1).optional(),
  parentName: z.string().min(1).optional(),
  parentPhone: z.string().min(1).optional(),
  parentEmail: z.string().email().optional().nullable(),
  source: z.enum(leadSourceValues).optional(),
  sourceDetail: z.string().optional().nullable(),
  interestedClassId: z.number().int().positive().optional().nullable(),
  status: z.enum(leadStatusValues).optional(),
  initialInquiryNotes: z.string().optional().nullable(),
  lostReason: z.enum(lostReasonValues).optional().nullable(),
  lostReasonNotes: z.string().optional().nullable(),
  convertedStudentId: z.number().int().positive().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  assignedToUserId: z.number().int().positive().optional().nullable(),
});

const CreateFollowUpBody = z.object({
  contactMethod: z.enum(contactMethodValues).optional(),
  contactedAt: z.string().datetime().optional(),
  discussionSummary: z.string().min(1),
  theirResponse: z.string().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  statusAfter: z.enum(leadStatusValues).optional(),
});

const leadSelect = {
  id: admissionLeadsTable.id,
  childName: admissionLeadsTable.childName,
  parentName: admissionLeadsTable.parentName,
  parentPhone: admissionLeadsTable.parentPhone,
  parentEmail: admissionLeadsTable.parentEmail,
  source: admissionLeadsTable.source,
  sourceDetail: admissionLeadsTable.sourceDetail,
  interestedClassId: admissionLeadsTable.interestedClassId,
  interestedClassName: classesTable.name,
  status: admissionLeadsTable.status,
  initialInquiryNotes: admissionLeadsTable.initialInquiryNotes,
  lostReason: admissionLeadsTable.lostReason,
  lostReasonNotes: admissionLeadsTable.lostReasonNotes,
  convertedStudentId: admissionLeadsTable.convertedStudentId,
  convertedAt: admissionLeadsTable.convertedAt,
  nextFollowUpAt: admissionLeadsTable.nextFollowUpAt,
  assignedToUserId: admissionLeadsTable.assignedToUserId,
  assignedToName: usersTable.name,
  followUpCount: sql<number>`(
    select count(*)::int from admission_lead_follow_ups f
    where f.lead_id = ${admissionLeadsTable.id}
  )`,
  lastContactedAt: sql<string | null>`(
    select max(f.contacted_at) from admission_lead_follow_ups f
    where f.lead_id = ${admissionLeadsTable.id}
  )`,
  branchId: admissionLeadsTable.branchId,
  sessionId: admissionLeadsTable.sessionId,
  createdAt: admissionLeadsTable.createdAt,
  updatedAt: admissionLeadsTable.updatedAt,
};

function parseOptionalDate(value: string | null | undefined) {
  if (value == null) return null;
  return new Date(value);
}

async function getLeadRow(branchId: number, sessionId: number, leadId: number) {
  const [row] = await db
    .select(leadSelect)
    .from(admissionLeadsTable)
    .leftJoin(classesTable, eq(admissionLeadsTable.interestedClassId, classesTable.id))
    .leftJoin(usersTable, eq(admissionLeadsTable.assignedToUserId, usersTable.id))
    .where(
      and(
        eq(admissionLeadsTable.branchId, branchId),
        eq(admissionLeadsTable.sessionId, sessionId),
        eq(admissionLeadsTable.id, leadId),
      ),
    )
    .limit(1);
  return row;
}

router.get("/branches/:branchId/sessions/:sessionId/admission-leads/summary", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const baseWhere = and(
    eq(admissionLeadsTable.branchId, branchId),
    eq(admissionLeadsTable.sessionId, sessionId),
  );

  const [totals, byStatus, bySource, byLostReason, followUpStats, overdueFollowUps] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          converted: sql<number>`count(*) filter (where ${admissionLeadsTable.status} = 'converted')::int`,
          lost: sql<number>`count(*) filter (where ${admissionLeadsTable.status} = 'lost')::int`,
          active: sql<number>`count(*) filter (where ${admissionLeadsTable.status} not in ('converted', 'lost'))::int`,
        })
        .from(admissionLeadsTable)
        .where(baseWhere),
      db
        .select({
          status: admissionLeadsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(admissionLeadsTable)
        .where(baseWhere)
        .groupBy(admissionLeadsTable.status),
      db
        .select({
          source: admissionLeadsTable.source,
          count: sql<number>`count(*)::int`,
          converted: sql<number>`count(*) filter (where ${admissionLeadsTable.status} = 'converted')::int`,
        })
        .from(admissionLeadsTable)
        .where(baseWhere)
        .groupBy(admissionLeadsTable.source),
      db
        .select({
          lostReason: admissionLeadsTable.lostReason,
          count: sql<number>`count(*)::int`,
        })
        .from(admissionLeadsTable)
        .where(and(baseWhere, eq(admissionLeadsTable.status, "lost")))
        .groupBy(admissionLeadsTable.lostReason),
      db
        .select({
          totalFollowUps: sql<number>`count(*)::int`,
          leadsWithFollowUp: sql<number>`count(distinct ${admissionLeadFollowUpsTable.leadId})::int`,
        })
        .from(admissionLeadFollowUpsTable)
        .where(
          and(
            eq(admissionLeadFollowUpsTable.branchId, branchId),
            eq(admissionLeadFollowUpsTable.sessionId, sessionId),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(admissionLeadsTable)
        .where(
          and(
            baseWhere,
            lte(admissionLeadsTable.nextFollowUpAt, sql`now()`),
            sql`${admissionLeadsTable.status} not in ('converted', 'lost')`,
          ),
        ),
    ]);

  const total = Number(totals[0]?.total ?? 0);
  const converted = Number(totals[0]?.converted ?? 0);
  const lost = Number(totals[0]?.lost ?? 0);
  const active = Number(totals[0]?.active ?? 0);

  return res.json({
    period: { branchId, sessionId },
    totals: { total, converted, lost, active },
    conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    bySource: bySource.map((r) => ({
      source: r.source,
      count: Number(r.count),
      converted: Number(r.converted),
      conversionRate: Number(r.count) > 0 ? Math.round((Number(r.converted) / Number(r.count)) * 100) : 0,
    })),
    byLostReason: byLostReason
      .filter((r) => r.lostReason != null)
      .map((r) => ({ reason: r.lostReason, count: Number(r.count) })),
    followUps: {
      total: Number(followUpStats[0]?.totalFollowUps ?? 0),
      leadsContacted: Number(followUpStats[0]?.leadsWithFollowUp ?? 0),
    },
    overdueFollowUps: Number(overdueFollowUps[0]?.count ?? 0),
    generatedAt: new Date().toISOString(),
  });
});

router.get("/branches/:branchId/sessions/:sessionId/admission-leads", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status as string | undefined;
  const source = req.query.source as string | undefined;
  const overdueOnly = req.query.overdueOnly === "true";
  const offset = (page - 1) * limit;

  const conditions = [
    eq(admissionLeadsTable.branchId, branchId),
    eq(admissionLeadsTable.sessionId, sessionId),
  ];
  if (status) conditions.push(eq(admissionLeadsTable.status, status as "new"));
  if (source) conditions.push(eq(admissionLeadsTable.source, source as "other"));
  if (overdueOnly) {
    conditions.push(lte(admissionLeadsTable.nextFollowUpAt, sql`now()`));
    conditions.push(sql`${admissionLeadsTable.status} not in ('converted', 'lost')`);
  }

  const where = and(...conditions);

  const [records, countResult] = await Promise.all([
    db
      .select(leadSelect)
      .from(admissionLeadsTable)
      .leftJoin(classesTable, eq(admissionLeadsTable.interestedClassId, classesTable.id))
      .leftJoin(usersTable, eq(admissionLeadsTable.assignedToUserId, usersTable.id))
      .where(where)
      .orderBy(desc(admissionLeadsTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(admissionLeadsTable).where(where),
  ]);

  return res.json({ data: records, total: Number(countResult[0].count), page, limit });
});

router.post("/branches/:branchId/sessions/:sessionId/admission-leads", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const values = insertAdmissionLeadSchema.parse({
    societyId: scope.societyId,
    schoolId: scope.schoolId,
    branchId: scope.branchId,
    sessionId: scope.sessionId,
    childName: parsed.data.childName,
    parentName: parsed.data.parentName,
    parentPhone: parsed.data.parentPhone,
    parentEmail: parsed.data.parentEmail ?? null,
    source: parsed.data.source ?? "other",
    sourceDetail: parsed.data.sourceDetail ?? null,
    interestedClassId: parsed.data.interestedClassId ?? null,
    initialInquiryNotes: parsed.data.initialInquiryNotes ?? null,
    nextFollowUpAt: parseOptionalDate(parsed.data.nextFollowUpAt ?? undefined),
    assignedToUserId: parsed.data.assignedToUserId ?? null,
    status: "new",
  });

  const [record] = await db.insert(admissionLeadsTable).values(values).returning();
  const row = await getLeadRow(branchId, sessionId, record.id);
  return res.status(201).json(row);
});

router.get("/branches/:branchId/sessions/:sessionId/admission-leads/:leadId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const leadId = Number(req.params.leadId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const lead = await getLeadRow(branchId, sessionId, leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const followUps = await db
    .select({
      id: admissionLeadFollowUpsTable.id,
      contactMethod: admissionLeadFollowUpsTable.contactMethod,
      contactedAt: admissionLeadFollowUpsTable.contactedAt,
      discussionSummary: admissionLeadFollowUpsTable.discussionSummary,
      theirResponse: admissionLeadFollowUpsTable.theirResponse,
      nextFollowUpAt: admissionLeadFollowUpsTable.nextFollowUpAt,
      createdAt: admissionLeadFollowUpsTable.createdAt,
      createdByName: usersTable.name,
    })
    .from(admissionLeadFollowUpsTable)
    .leftJoin(usersTable, eq(admissionLeadFollowUpsTable.createdBy, usersTable.id))
    .where(eq(admissionLeadFollowUpsTable.leadId, leadId))
    .orderBy(desc(admissionLeadFollowUpsTable.contactedAt));

  return res.json({ ...lead, followUps });
});

router.patch("/branches/:branchId/sessions/:sessionId/admission-leads/:leadId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const leadId = Number(req.params.leadId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const update: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.childName != null) update.childName = d.childName;
  if (d.parentName != null) update.parentName = d.parentName;
  if (d.parentPhone != null) update.parentPhone = d.parentPhone;
  if (d.parentEmail !== undefined) update.parentEmail = d.parentEmail;
  if (d.source != null) update.source = d.source;
  if (d.sourceDetail !== undefined) update.sourceDetail = d.sourceDetail;
  if (d.interestedClassId !== undefined) update.interestedClassId = d.interestedClassId;
  if (d.status != null) update.status = d.status;
  if (d.initialInquiryNotes !== undefined) update.initialInquiryNotes = d.initialInquiryNotes;
  if (d.lostReason !== undefined) update.lostReason = d.lostReason;
  if (d.lostReasonNotes !== undefined) update.lostReasonNotes = d.lostReasonNotes;
  if (d.convertedStudentId !== undefined) update.convertedStudentId = d.convertedStudentId;
  if (d.nextFollowUpAt !== undefined) update.nextFollowUpAt = parseOptionalDate(d.nextFollowUpAt ?? undefined);
  if (d.assignedToUserId !== undefined) update.assignedToUserId = d.assignedToUserId;

  if (d.status === "converted") {
    update.convertedAt = new Date();
    update.lostReason = null;
    update.lostReasonNotes = null;
  }
  if (d.status === "lost") {
    update.convertedAt = null;
    update.convertedStudentId = null;
  }

  const [updated] = await db
    .update(admissionLeadsTable)
    .set(update)
    .where(
      and(
        eq(admissionLeadsTable.id, leadId),
        eq(admissionLeadsTable.branchId, branchId),
        eq(admissionLeadsTable.sessionId, sessionId),
      ),
    )
    .returning();

  if (!updated) return res.status(404).json({ error: "Lead not found" });
  const row = await getLeadRow(branchId, sessionId, leadId);
  return res.json(row);
});

router.post(
  "/branches/:branchId/sessions/:sessionId/admission-leads/:leadId/follow-ups",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const leadId = Number(req.params.leadId);
    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const parsed = CreateFollowUpBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const [lead] = await db
      .select({ id: admissionLeadsTable.id })
      .from(admissionLeadsTable)
      .where(
        and(
          eq(admissionLeadsTable.id, leadId),
          eq(admissionLeadsTable.branchId, branchId),
          eq(admissionLeadsTable.sessionId, sessionId),
        ),
      )
      .limit(1);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const followUpValues = insertAdmissionLeadFollowUpSchema.parse({
      leadId,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
      contactMethod: parsed.data.contactMethod ?? "call",
      contactedAt: parseOptionalDate(parsed.data.contactedAt) ?? new Date(),
      discussionSummary: parsed.data.discussionSummary,
      theirResponse: parsed.data.theirResponse ?? null,
      nextFollowUpAt: parseOptionalDate(parsed.data.nextFollowUpAt ?? undefined),
    });

    const [followUp] = await db
      .insert(admissionLeadFollowUpsTable)
      .values(followUpValues)
      .returning();

    const leadUpdate: Record<string, unknown> = {
      nextFollowUpAt: followUpValues.nextFollowUpAt ?? null,
    };
    if (parsed.data.statusAfter) {
      leadUpdate.status = parsed.data.statusAfter;
    } else if (parsed.data.statusAfter == null) {
      leadUpdate.status = "follow_up";
    }

    await db
      .update(admissionLeadsTable)
      .set(leadUpdate)
      .where(eq(admissionLeadsTable.id, leadId));

    const detail = await db
      .select({
        id: admissionLeadFollowUpsTable.id,
        contactMethod: admissionLeadFollowUpsTable.contactMethod,
        contactedAt: admissionLeadFollowUpsTable.contactedAt,
        discussionSummary: admissionLeadFollowUpsTable.discussionSummary,
        theirResponse: admissionLeadFollowUpsTable.theirResponse,
        nextFollowUpAt: admissionLeadFollowUpsTable.nextFollowUpAt,
        createdAt: admissionLeadFollowUpsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(admissionLeadFollowUpsTable)
      .leftJoin(usersTable, eq(admissionLeadFollowUpsTable.createdBy, usersTable.id))
      .where(eq(admissionLeadFollowUpsTable.id, followUp.id))
      .limit(1);

    return res.status(201).json(detail[0]);
  },
);

router.get(
  "/branches/:branchId/sessions/:sessionId/admission-leads/:leadId/follow-ups",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const leadId = Number(req.params.leadId);
    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const followUps = await db
      .select({
        id: admissionLeadFollowUpsTable.id,
        contactMethod: admissionLeadFollowUpsTable.contactMethod,
        contactedAt: admissionLeadFollowUpsTable.contactedAt,
        discussionSummary: admissionLeadFollowUpsTable.discussionSummary,
        theirResponse: admissionLeadFollowUpsTable.theirResponse,
        nextFollowUpAt: admissionLeadFollowUpsTable.nextFollowUpAt,
        createdAt: admissionLeadFollowUpsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(admissionLeadFollowUpsTable)
      .leftJoin(usersTable, eq(admissionLeadFollowUpsTable.createdBy, usersTable.id))
      .where(
        and(
          eq(admissionLeadFollowUpsTable.leadId, leadId),
          eq(admissionLeadFollowUpsTable.branchId, branchId),
          eq(admissionLeadFollowUpsTable.sessionId, sessionId),
        ),
      )
      .orderBy(asc(admissionLeadFollowUpsTable.contactedAt));

    return res.json({ data: followUps });
  },
);

export default router;
