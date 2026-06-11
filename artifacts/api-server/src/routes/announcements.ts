import { Router } from "express";
import { announcementsTable, db, usersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { CreateAnnouncementBody } from "@workspace/api-zod";
import { resolveBranchScope } from "../lib/scope";
import { mapAnnouncementResponse } from "../lib/response-mappers";

const router = Router();

router.get("/branches/:branchId/announcements", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const audience = req.query.audience as string | undefined;
  const limit = Number(req.query.limit) || 20;

  const conditions = [eq(announcementsTable.branchId, branchId)];
  if (audience) conditions.push(eq(announcementsTable.audience, audience as "all"));

  const announcements = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      body: announcementsTable.body,
      audience: announcementsTable.audience,
      priority: announcementsTable.priority,
      branchId: announcementsTable.branchId,
      authorName: usersTable.name,
      createdAt: announcementsTable.createdAt,
    })
    .from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.createdBy, usersTable.id))
    .where(and(...conditions))
    .orderBy(sql`${announcementsTable.createdAt} desc`)
    .limit(limit);

  return res.json(announcements.map(mapAnnouncementResponse));
});

router.post("/branches/:branchId/announcements", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const body = parsed.data as Record<string, unknown>;
  const [ann] = await db
    .insert(announcementsTable)
    .values({
      title: String(body.title),
      body: String(body.body ?? body.content),
      audience: (body.audience ?? "all") as "all",
      priority: (body.priority ?? "normal") as "normal",
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      createdBy: body.createdBy != null ? Number(body.createdBy) : null,
    })
    .returning();

  return res.status(201).json(mapAnnouncementResponse({ ...ann, authorName: null }));
});

router.delete("/branches/:branchId/announcements/:announcementId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const announcementId = Number(req.params.announcementId);

  await db
    .delete(announcementsTable)
    .where(
      and(
        eq(announcementsTable.id, announcementId),
        eq(announcementsTable.branchId, branchId),
      ),
    );

  return res.json({ message: "Announcement deleted" });
});

export default router;
