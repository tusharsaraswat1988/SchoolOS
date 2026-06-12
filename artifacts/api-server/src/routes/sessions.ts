import { Router } from "express";
import {
  academicSessionsTable,
  db,
  financialSessionsTable,
  insertAcademicSessionSchema,
  insertFinancialSessionSchema,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveCurrentFinancialSession, resolveCurrentSession } from "../lib/scope";
import {
  resolveBranchHierarchy,
  setCurrentAcademicSession,
  setCurrentFinancialSession,
} from "../lib/session-management";

const router = Router();

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreateSessionBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  startsOn: dateString,
  endsOn: dateString,
  isCurrent: z.boolean().optional(),
});

const UpdateSessionBody = z.object({
  name: z.string().min(1).optional(),
  startsOn: dateString.optional(),
  endsOn: dateString.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

router.get("/branches/:branchId/sessions", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessions = await db
    .select()
    .from(academicSessionsTable)
    .where(eq(academicSessionsTable.branchId, branchId));
  return res.json({ data: sessions, total: sessions.length });
});

router.get("/branches/:branchId/sessions/current", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const session = await resolveCurrentSession(branchId);
  if (!session) return res.status(404).json({ error: "No current session" });
  return res.json(session);
});

router.post("/branches/:branchId/sessions", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const branch = await resolveBranchHierarchy(branchId);
  if (!branch) return res.status(404).json({ error: "Branch not found" });

  const values = insertAcademicSessionSchema.parse({
    societyId: branch.societyId,
    schoolId: branch.schoolId,
    branchId: branch.id,
    code: parsed.data.code,
    name: parsed.data.name,
    startsOn: parsed.data.startsOn,
    endsOn: parsed.data.endsOn,
    isCurrent: false,
    status: "active",
  });

  const [session] = await db.insert(academicSessionsTable).values(values).returning();

  if (parsed.data.isCurrent) {
    await setCurrentAcademicSession(branchId, session.id);
    const [updated] = await db
      .select()
      .from(academicSessionsTable)
      .where(eq(academicSessionsTable.id, session.id))
      .limit(1);
    return res.status(201).json(updated);
  }

  return res.status(201).json(session);
});

router.patch("/branches/:branchId/sessions/:sessionId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const update: Record<string, unknown> = {};
  if (parsed.data.name != null) update.name = parsed.data.name;
  if (parsed.data.startsOn != null) update.startsOn = parsed.data.startsOn;
  if (parsed.data.endsOn != null) update.endsOn = parsed.data.endsOn;
  if (parsed.data.status != null) update.status = parsed.data.status;

  const [session] = await db
    .update(academicSessionsTable)
    .set(update)
    .where(
      and(
        eq(academicSessionsTable.id, sessionId),
        eq(academicSessionsTable.branchId, branchId),
      ),
    )
    .returning();

  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json(session);
});

router.post("/branches/:branchId/sessions/:sessionId/set-current", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);

  const [existing] = await db
    .select()
    .from(academicSessionsTable)
    .where(
      and(
        eq(academicSessionsTable.id, sessionId),
        eq(academicSessionsTable.branchId, branchId),
      ),
    )
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Session not found" });

  await setCurrentAcademicSession(branchId, sessionId);

  const [session] = await db
    .select()
    .from(academicSessionsTable)
    .where(eq(academicSessionsTable.id, sessionId))
    .limit(1);

  return res.json(session);
});

router.get("/branches/:branchId/financial-sessions", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessions = await db
    .select()
    .from(financialSessionsTable)
    .where(eq(financialSessionsTable.branchId, branchId));
  return res.json({ data: sessions, total: sessions.length });
});

router.get("/branches/:branchId/financial-sessions/current", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const session = await resolveCurrentFinancialSession(branchId);
  if (!session) return res.status(404).json({ error: "No current financial session" });
  return res.json(session);
});

router.post("/branches/:branchId/financial-sessions", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const branch = await resolveBranchHierarchy(branchId);
  if (!branch) return res.status(404).json({ error: "Branch not found" });

  const values = insertFinancialSessionSchema.parse({
    societyId: branch.societyId,
    schoolId: branch.schoolId,
    branchId: branch.id,
    code: parsed.data.code,
    name: parsed.data.name,
    startsOn: parsed.data.startsOn,
    endsOn: parsed.data.endsOn,
    isCurrent: false,
    status: "active",
  });

  const [session] = await db.insert(financialSessionsTable).values(values).returning();

  if (parsed.data.isCurrent) {
    await setCurrentFinancialSession(branchId, session.id);
    const [updated] = await db
      .select()
      .from(financialSessionsTable)
      .where(eq(financialSessionsTable.id, session.id))
      .limit(1);
    return res.status(201).json(updated);
  }

  return res.status(201).json(session);
});

router.patch("/branches/:branchId/financial-sessions/:financialSessionId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const financialSessionId = Number(req.params.financialSessionId);
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const update: Record<string, unknown> = {};
  if (parsed.data.name != null) update.name = parsed.data.name;
  if (parsed.data.startsOn != null) update.startsOn = parsed.data.startsOn;
  if (parsed.data.endsOn != null) update.endsOn = parsed.data.endsOn;
  if (parsed.data.status != null) update.status = parsed.data.status;

  const [session] = await db
    .update(financialSessionsTable)
    .set(update)
    .where(
      and(
        eq(financialSessionsTable.id, financialSessionId),
        eq(financialSessionsTable.branchId, branchId),
      ),
    )
    .returning();

  if (!session) return res.status(404).json({ error: "Financial session not found" });
  return res.json(session);
});

router.post(
  "/branches/:branchId/financial-sessions/:financialSessionId/set-current",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const financialSessionId = Number(req.params.financialSessionId);

    const [existing] = await db
      .select()
      .from(financialSessionsTable)
      .where(
        and(
          eq(financialSessionsTable.id, financialSessionId),
          eq(financialSessionsTable.branchId, branchId),
        ),
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Financial session not found" });

    await setCurrentFinancialSession(branchId, financialSessionId);

    const [session] = await db
      .select()
      .from(financialSessionsTable)
      .where(eq(financialSessionsTable.id, financialSessionId))
      .limit(1);

    return res.json(session);
  },
);

export default router;
