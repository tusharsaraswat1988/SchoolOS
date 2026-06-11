import { Router } from "express";
import {
  classesTable,
  db,
  feeHeadsTable,
  feeStructuresTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CreateFeeHeadBody, CreateFeeStructureBody } from "../lib/udise-schemas";
import { resolveBranchScope, resolveSessionScope } from "../lib/scope";
import { toPgDate } from "../lib/db-values";

const router = Router();

router.get("/branches/:branchId/fee-heads", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const rows = await db.select().from(feeHeadsTable).where(eq(feeHeadsTable.branchId, branchId));
  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/fee-heads", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const parsed = CreateFeeHeadBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [row] = await db
    .insert(feeHeadsTable)
    .values({
      ...parsed.data,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
    })
    .returning();

  return res.status(201).json(row);
});

router.get("/branches/:branchId/sessions/:sessionId/fee-structures", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const rows = await db
    .select()
    .from(feeStructuresTable)
    .where(
      and(eq(feeStructuresTable.branchId, branchId), eq(feeStructuresTable.sessionId, sessionId)),
    );

  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/sessions/:sessionId/fee-structures", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateFeeStructureBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [row] = await db
    .insert(feeStructuresTable)
    .values({
      classId: parsed.data.classId,
      feeHeadId: parsed.data.feeHeadId,
      amount: parsed.data.amount,
      dueDayOfMonth: parsed.data.dueDayOfMonth,
      effectiveFrom: parsed.data.effectiveFrom ? toPgDate(parsed.data.effectiveFrom) : null,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    })
    .returning();

  return res.status(201).json(row);
});

export default router;
