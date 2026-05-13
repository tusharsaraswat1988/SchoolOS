import { Router } from "express";
import { db, schoolsTable } from "@workspace/db";
import { eq, like, sql } from "drizzle-orm";
import { CreateSchoolBody, UpdateSchoolBody } from "@workspace/api-zod";

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

router.post("/schools", async (req, res) => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const [school] = await db.insert(schoolsTable).values(parsed.data).returning();
  return res.status(201).json(school);
});

router.get("/schools/:schoolId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1);
  if (!school) return res.status(404).json({ error: "School not found" });
  return res.json(school);
});

router.patch("/schools/:schoolId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = UpdateSchoolBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });
  const [school] = await db.update(schoolsTable).set(parsed.data).where(eq(schoolsTable.id, schoolId)).returning();
  if (!school) return res.status(404).json({ error: "School not found" });
  return res.json(school);
});

export default router;
