import { Router } from "express";
import { db, documentMasterTable, schoolsTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

const entityModuleValues = [
  "student",
  "staff",
  "teacher",
  "driver",
  "vehicle",
  "vendor",
] as const;

const CreateDocumentMasterBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  applicableModules: z.array(z.enum(entityModuleValues)).min(1),
  isMandatory: z.boolean().optional(),
  allowExpiryDate: z.boolean().optional(),
  allowDocumentNumber: z.boolean().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
});

const UpdateDocumentMasterBody = CreateDocumentMasterBody.partial().extend({
  isActive: z.boolean().optional(),
});

function mapDocumentMaster(row: typeof documentMasterTable.$inferSelect) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.name,
    description: row.description,
    applicableModules: row.applicableModules ?? [],
    isMandatory: row.isMandatory,
    allowExpiryDate: row.allowExpiryDate,
    allowDocumentNumber: row.allowDocumentNumber,
    allowedFileTypes: row.allowedFileTypes ?? [],
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/schools/:schoolId/document-master", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const module = req.query.module as string | undefined;
  const activeOnly = req.query.activeOnly !== "false";

  const conditions = [eq(documentMasterTable.schoolId, schoolId)];
  if (activeOnly) conditions.push(eq(documentMasterTable.isActive, true));

  const rows = await db
    .select()
    .from(documentMasterTable)
    .where(and(...conditions))
    .orderBy(asc(documentMasterTable.name));

  let filtered = rows;
  if (module) {
    filtered = rows.filter((r) => (r.applicableModules ?? []).includes(module));
  }

  return res.json({ data: filtered.map(mapDocumentMaster), total: filtered.length });
});

router.post("/schools/:schoolId/document-master", async (req, res) => {
  const schoolId = Number(req.params.schoolId);

  const [school] = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.id, schoolId))
    .limit(1);

  if (!school) return res.status(404).json({ error: "School not found" });

  const parsed = CreateDocumentMasterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const body = parsed.data;
  const [row] = await db
    .insert(documentMasterTable)
    .values({
      societyId: school.societyId,
      schoolId,
      name: body.name,
      description: body.description ?? null,
      applicableModules: body.applicableModules,
      isMandatory: body.isMandatory ?? false,
      allowExpiryDate: body.allowExpiryDate ?? false,
      allowDocumentNumber: body.allowDocumentNumber ?? false,
      allowedFileTypes: body.allowedFileTypes ?? ["pdf", "jpg", "jpeg", "png"],
    })
    .returning();

  return res.status(201).json(mapDocumentMaster(row));
});

router.patch("/schools/:schoolId/document-master/:masterId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const masterId = Number(req.params.masterId);

  const parsed = UpdateDocumentMasterBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const body = parsed.data;
  const [row] = await db
    .update(documentMasterTable)
    .set({
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.applicableModules != null ? { applicableModules: body.applicableModules } : {}),
      ...(body.isMandatory != null ? { isMandatory: body.isMandatory } : {}),
      ...(body.allowExpiryDate != null ? { allowExpiryDate: body.allowExpiryDate } : {}),
      ...(body.allowDocumentNumber != null
        ? { allowDocumentNumber: body.allowDocumentNumber }
        : {}),
      ...(body.allowedFileTypes != null ? { allowedFileTypes: body.allowedFileTypes } : {}),
      ...(body.isActive != null ? { isActive: body.isActive } : {}),
    })
    .where(
      and(eq(documentMasterTable.id, masterId), eq(documentMasterTable.schoolId, schoolId)),
    )
    .returning();

  if (!row) return res.status(404).json({ error: "Document type not found" });
  return res.json(mapDocumentMaster(row));
});

export default router;
