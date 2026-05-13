import { Router } from "express";
import { db, announcementsTable, usersTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router = Router();

router.get("/schools/:schoolId/announcements", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const audience = req.query.audience as string | undefined;
  const limit = Number(req.query.limit) || 20;

  const conditions = [eq(announcementsTable.schoolId, schoolId)];
  if (audience) conditions.push(eq(announcementsTable.audience, audience as any));

  const announcements = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      content: announcementsTable.content,
      audience: announcementsTable.audience,
      priority: announcementsTable.priority,
      schoolId: announcementsTable.schoolId,
      authorName: usersTable.name,
      createdAt: announcementsTable.createdAt,
    })
    .from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(and(...conditions))
    .orderBy(sql`${announcementsTable.createdAt} desc`)
    .limit(limit);

  return res.json(announcements);
});

router.post("/schools/:schoolId/announcements", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [ann] = await db
    .insert(announcementsTable)
    .values({ ...parsed.data, schoolId })
    .returning();

  return res.status(201).json({ ...ann, authorName: null });
});

router.delete("/schools/:schoolId/announcements/:announcementId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const announcementId = Number(req.params.announcementId);

  await db
    .delete(announcementsTable)
    .where(and(eq(announcementsTable.id, announcementId), eq(announcementsTable.schoolId, schoolId)));

  return res.json({ message: "Announcement deleted" });
});

export default router;
