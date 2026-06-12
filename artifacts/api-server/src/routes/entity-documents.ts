import { Router } from "express";
import {
  db,
  documentMasterTable,
  documentVerificationsTable,
  documentsTable,
} from "@workspace/db";
import type { UploadResult } from "@workspace/cloudinary";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { assertMediaUploadReady, cloudinaryService, isCloudinaryConfigured } from "../lib/cloudinary";
import { toPgDate } from "../lib/db-values";
import { resolveSessionScope } from "../lib/scope";
import { getStudentInSession } from "../lib/student-scope";
import { uploadMiddleware } from "../lib/upload";

const router = Router();

const entityTypeValues = [
  "student",
  "staff",
  "teacher",
  "driver",
  "vehicle",
  "vendor",
] as const;

const verificationStatusValues = ["pending", "verified", "rejected"] as const;

function mapDocumentRow(
  row: typeof documentsTable.$inferSelect,
  master?: typeof documentMasterTable.$inferSelect | null,
) {
  const previewUrl = row.publicId && isCloudinaryConfigured()
    ? cloudinaryService.getSecureUrl(row.publicId)
    : row.secureUrl;

  const isExpired =
    row.expiryDate != null && new Date(row.expiryDate) < new Date(new Date().toDateString());

  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    documentMasterId: row.documentMasterId,
    documentTypeName: master?.name ?? null,
    documentNumber: row.documentNumber,
    fileName: row.fileName,
    mimeType: row.mimeType,
    bytes: row.bytes,
    previewUrl,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    remarks: row.remarks,
    verificationStatus: row.verificationStatus,
    isExpired,
    isMandatory: master?.isMandatory ?? false,
    allowExpiryDate: master?.allowExpiryDate ?? false,
    allowDocumentNumber: master?.allowDocumentNumber ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function removeDocumentAsset(row: { publicId: string | null; resourceType: string | null }) {
  if (!row.publicId || !isCloudinaryConfigured()) return;
  await cloudinaryService.deleteAsset(
    row.publicId,
    (row.resourceType as UploadResult["resourceType"]) ?? "auto",
  );
}

// ─── Student entity documents ────────────────────────────────────────────────

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/entity-documents",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const filter = req.query.filter as string | undefined;

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const masterRows = await db
      .select()
      .from(documentMasterTable)
      .where(
        and(
          eq(documentMasterTable.schoolId, scope.schoolId),
          eq(documentMasterTable.isActive, true),
        ),
      );

    const studentMasters = masterRows.filter((m) =>
      (m.applicableModules ?? []).includes("student"),
    );

    const uploaded = await db
      .select({
        doc: documentsTable,
        master: documentMasterTable,
      })
      .from(documentsTable)
      .leftJoin(documentMasterTable, eq(documentsTable.documentMasterId, documentMasterTable.id))
      .where(
        and(
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, studentId),
        ),
      );

    const uploadedByMaster = new Map(uploaded.map((u) => [u.doc.documentMasterId, u]));

    const dashboard = studentMasters.map((master) => {
      const entry = uploadedByMaster.get(master.id);
      const doc = entry?.doc;
      const mapped = doc ? mapDocumentRow(doc, master) : null;

      let status: "uploaded" | "missing" | "expired" | "pending" | "rejected" = "missing";
      if (mapped) {
        if (mapped.isExpired) status = "expired";
        else if (mapped.verificationStatus === "rejected") status = "rejected";
        else if (mapped.verificationStatus === "pending") status = "pending";
        else status = "uploaded";
      }

      return {
        documentMasterId: master.id,
        name: master.name,
        description: master.description,
        isMandatory: master.isMandatory,
        status,
        document: mapped,
      };
    });

    let filtered = dashboard;
    if (filter === "missing") {
      filtered = dashboard.filter((d) => d.status === "missing");
    } else if (filter === "expired") {
      filtered = dashboard.filter((d) => d.status === "expired");
    } else if (filter === "pending") {
      filtered = dashboard.filter((d) => d.status === "pending");
    } else if (filter === "rejected") {
      filtered = dashboard.filter((d) => d.status === "rejected");
    }

    const mandatory = dashboard.filter((d) => d.isMandatory);
    const uploadedCount = mandatory.filter((d) => d.status === "uploaded").length;

    return res.json({
      data: filtered,
      dashboard,
      summary: {
        totalRequired: mandatory.length,
        uploadedRequired: uploadedCount,
        completionPercent:
          mandatory.length > 0 ? Math.round((uploadedCount / mandatory.length) * 100) : 100,
        missing: dashboard.filter((d) => d.status === "missing").length,
        expired: dashboard.filter((d) => d.status === "expired").length,
        pendingVerification: dashboard.filter((d) => d.status === "pending").length,
        rejected: dashboard.filter((d) => d.status === "rejected").length,
      },
    });
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/entity-documents",
  uploadMiddleware.single("file"),
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const documentMasterId = Number(req.body.documentMasterId);
    if (!documentMasterId) return res.status(400).json({ error: "documentMasterId is required" });

    const [master] = await db
      .select()
      .from(documentMasterTable)
      .where(
        and(
          eq(documentMasterTable.id, documentMasterId),
          eq(documentMasterTable.schoolId, scope.schoolId),
          eq(documentMasterTable.isActive, true),
        ),
      )
      .limit(1);

    if (!master) return res.status(404).json({ error: "Document type not found" });

    if (!req.file) return res.status(400).json({ error: "File is required" });

    assertMediaUploadReady();

    const upload = await cloudinaryService.uploadStudentDocument(req.file.buffer, {
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
      studentId,
      documentType: "other",
      filename: req.file.originalname,
    });

    const [row] = await db
      .insert(documentsTable)
      .values({
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
        entityType: "student",
        entityId: studentId,
        documentMasterId,
        documentNumber: req.body.documentNumber ? String(req.body.documentNumber) : null,
        publicId: upload.publicId,
        secureUrl: upload.secureUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        resourceType: upload.resourceType ?? "auto",
        bytes: upload.bytes,
        issueDate: req.body.issueDate ? toPgDate(String(req.body.issueDate)) : null,
        expiryDate: req.body.expiryDate ? toPgDate(String(req.body.expiryDate)) : null,
        remarks: req.body.remarks ? String(req.body.remarks) : null,
        verificationStatus: "pending",
      })
      .returning();

    return res.status(201).json(mapDocumentRow(row, master));
  },
);

router.patch(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/entity-documents/:documentId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const documentId = Number(req.params.documentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const parsed = z
      .object({
        documentNumber: z.string().optional().nullable(),
        issueDate: z.string().optional().nullable(),
        expiryDate: z.string().optional().nullable(),
        remarks: z.string().optional().nullable(),
        verificationStatus: z.enum(verificationStatusValues).optional(),
        rejectionReason: z.string().optional().nullable(),
      })
      .safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [existing] = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, studentId),
        ),
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Document not found" });

    const body = parsed.data;
    const [row] = await db
      .update(documentsTable)
      .set({
        ...(body.documentNumber !== undefined ? { documentNumber: body.documentNumber } : {}),
        ...(body.issueDate !== undefined
          ? { issueDate: body.issueDate ? toPgDate(body.issueDate) : null }
          : {}),
        ...(body.expiryDate !== undefined
          ? { expiryDate: body.expiryDate ? toPgDate(body.expiryDate) : null }
          : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        ...(body.verificationStatus != null ? { verificationStatus: body.verificationStatus } : {}),
      })
      .where(eq(documentsTable.id, documentId))
      .returning();

    if (body.verificationStatus) {
      await db.insert(documentVerificationsTable).values({
        documentId,
        status: body.verificationStatus,
        rejectionReason: body.rejectionReason ?? null,
      });
    }

    const [master] = await db
      .select()
      .from(documentMasterTable)
      .where(eq(documentMasterTable.id, row.documentMasterId))
      .limit(1);

    return res.json(mapDocumentRow(row, master));
  },
);

router.delete(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/entity-documents/:documentId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const documentId = Number(req.params.documentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [row] = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, studentId),
        ),
      )
      .limit(1);

    if (!row) return res.status(404).json({ error: "Document not found" });

    await removeDocumentAsset(row);
    await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

    return res.json({ message: "Document removed" });
  },
);

export default router;
