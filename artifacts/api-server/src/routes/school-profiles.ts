import { Router } from "express";
import { db, academicSessionsTable, schoolProfilesTable, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SchoolProfileBody } from "../lib/udise-schemas";

const router = Router();

router.get("/schools/:schoolId/profile", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1);
  if (!school) return res.status(404).json({ error: "School not found" });

  const [profile] = await db
    .select()
    .from(schoolProfilesTable)
    .where(eq(schoolProfilesTable.schoolId, schoolId))
    .limit(1);

  const sessions = await db
    .select({
      branchId: academicSessionsTable.branchId,
      code: academicSessionsTable.code,
      startsOn: academicSessionsTable.startsOn,
      endsOn: academicSessionsTable.endsOn,
      isCurrent: academicSessionsTable.isCurrent,
    })
    .from(academicSessionsTable)
    .where(eq(academicSessionsTable.schoolId, schoolId));

  return res.json({
    schoolId,
    schoolName: school.name,
    schoolCode: school.code,
    profile: profile ?? null,
    academicSessions: sessions,
  });
});

router.patch("/schools/:schoolId/profile", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = SchoolProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1);
  if (!school) return res.status(404).json({ error: "School not found" });

  const [existing] = await db
    .select()
    .from(schoolProfilesTable)
    .where(eq(schoolProfilesTable.schoolId, schoolId))
    .limit(1);

  const values = {
    ...parsed.data,
    email: parsed.data.email || null,
    principalEmail: parsed.data.principalEmail || null,
  };

  const [profile] = existing
    ? await db
        .update(schoolProfilesTable)
        .set(values)
        .where(eq(schoolProfilesTable.schoolId, schoolId))
        .returning()
    : await db
        .insert(schoolProfilesTable)
        .values({ schoolId, ...values })
        .returning();

  return res.json(profile);
});

export default router;
