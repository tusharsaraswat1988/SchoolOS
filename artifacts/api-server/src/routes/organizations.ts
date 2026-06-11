import { Router } from "express";
import {
  academicSessionsTable,
  branchesTable,
  db,
  schoolsTable,
  societiesTable,
} from "@workspace/db";
import { and, eq, like, sql } from "drizzle-orm";
import { CreateSchoolBody, UpdateSchoolBody } from "@workspace/api-zod";
import { resolveCurrentSession } from "../lib/scope";
import { isAuthenticatedRequest } from "../lib/auth-context";

const router = Router();

router.get("/schools", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(schoolsTable);
  if (search) {
    query = query.where(like(schoolsTable.name, `%${search}%`)) as typeof query;
  }

  const [schools, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(schoolsTable),
  ]);

  return res.json({
    data: schools,
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.get("/societies", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(societiesTable);
  const auth = isAuthenticatedRequest(req) ? req.auth : null;
  if (auth?.scope.role === "society_admin" && auth.scope.societyId) {
    const societyFilter = eq(societiesTable.id, auth.scope.societyId);
    query = query.where(
      search ? and(societyFilter, like(societiesTable.name, `%${search}%`)) : societyFilter,
    ) as typeof query;
  } else if (search) {
    query = query.where(like(societiesTable.name, `%${search}%`)) as typeof query;
  }

  const [societies, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(societiesTable),
  ]);

  return res.json({
    data: societies,
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.get("/societies/:societyId", async (req, res) => {
  const societyId = Number(req.params.societyId);
  const [society] = await db
    .select()
    .from(societiesTable)
    .where(eq(societiesTable.id, societyId))
    .limit(1);
  if (!society) return res.status(404).json({ error: "Society not found" });
  return res.json(society);
});

router.get("/societies/:societyId/schools", async (req, res) => {
  const societyId = Number(req.params.societyId);
  const schools = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.societyId, societyId));
  return res.json({ data: schools, total: schools.length });
});

router.get("/schools/:schoolId/branches", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const branches = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.schoolId, schoolId));
  return res.json({ data: branches, total: branches.length });
});

router.get("/branches/:branchId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const [branch] = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  if (!branch) return res.status(404).json({ error: "Branch not found" });
  return res.json(branch);
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

router.post("/schools", async (req, res) => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const body = parsed.data as Record<string, unknown>;
  const societyId = Number(body.societyId);

  const auth = isAuthenticatedRequest(req) ? req.auth : null;
  if (auth?.scope.role === "society_admin" && auth.scope.societyId !== societyId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [school] = await db
    .insert(schoolsTable)
    .values({
      societyId: Number(body.societyId),
      code: String(body.code),
      name: String(body.name),
      status: (body.status as "active" | undefined) ?? "active",
    })
    .returning();
  return res.status(201).json(school);
});

router.get("/schools/:schoolId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const [school] = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.id, schoolId))
    .limit(1);
  if (!school) return res.status(404).json({ error: "School not found" });
  return res.json(school);
});

router.patch("/schools/:schoolId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const body = parsed.data as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (body.name != null) update.name = body.name;
  if (body.code != null) update.code = body.code;
  if (body.status != null) {
    const status = String(body.status);
    update.status = status === "suspended" ? "inactive" : status;
  }
  const [school] = await db
    .update(schoolsTable)
    .set(update)
    .where(eq(schoolsTable.id, schoolId))
    .returning();
  if (!school) return res.status(404).json({ error: "School not found" });
  return res.json(school);
});

export default router;
