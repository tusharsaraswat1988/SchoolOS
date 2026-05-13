import { Router } from "express";
import { db, staffTable, schoolsTable } from "@workspace/db";
import { eq, like, sql, and } from "drizzle-orm";
import { CreateStaffBody, UpdateStaffBody } from "@workspace/api-zod";

const router = Router();

router.get("/schools/:schoolId/staff", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;

  const conditions = [eq(staffTable.schoolId, schoolId)];
  if (role) conditions.push(eq(staffTable.role, role as any));
  if (search) conditions.push(like(staffTable.firstName, `%${search}%`));

  const [members, countResult] = await Promise.all([
    db.select().from(staffTable).where(and(...conditions)),
    db.select({ count: sql<number>`count(*)` }).from(staffTable).where(and(...conditions)),
  ]);

  return res.json({ data: members, total: Number(countResult[0].count) });
});

router.post("/schools/:schoolId/staff", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [member] = await db.insert(staffTable).values({ ...parsed.data, schoolId }).returning();

  await db
    .update(schoolsTable)
    .set({ staffCount: sql`${schoolsTable.staffCount} + 1` })
    .where(eq(schoolsTable.id, schoolId));

  return res.status(201).json(member);
});

router.get("/schools/:schoolId/staff/:staffId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const staffId = Number(req.params.staffId);
  const [member] = await db
    .select()
    .from(staffTable)
    .where(and(eq(staffTable.id, staffId), eq(staffTable.schoolId, schoolId)))
    .limit(1);
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  return res.json(member);
});

router.patch("/schools/:schoolId/staff/:staffId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const staffId = Number(req.params.staffId);
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [member] = await db
    .update(staffTable)
    .set(parsed.data)
    .where(and(eq(staffTable.id, staffId), eq(staffTable.schoolId, schoolId)))
    .returning();
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  return res.json(member);
});

export default router;
