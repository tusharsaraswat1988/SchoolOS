import { Router } from "express";
import {
  db,
  SINGLE_STUDENT_DOCUMENT_TYPES,
  studentDocumentsTable,
  studentsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { UploadResult } from "@workspace/cloudinary";
import { assertMediaUploadReady, cloudinaryService, isCloudinaryConfigured } from "../lib/cloudinary";
import { uploadMiddleware } from "../lib/upload";
import { resolveSessionScope } from "../lib/scope";
import { StudentDocumentTypeBody } from "../lib/udise-schemas";

const router = Router({ mergeParams: true });

const SINGLE_TYPES = new Set<string>(SINGLE_STUDENT_DOCUMENT_TYPES);

async function getStudentInSession(
  branchId: number,
  sessionId: number,
  studentId: number,
) {
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return null;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        eq(studentsTable.id, studentId),
        eq(studentsTable.branchId, branchId),
        eq(studentsTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  return student ?? null;
}

function mapDocumentRow(row: typeof studentDocumentsTable.$inferSelect) {
  const previewUrl = isCloudinaryConfigured()
    ? cloudinaryService.getSecureUrl(row.publicId)
    : row.secureUrl;
  return {
    id: row.id,
    studentId: row.studentId,
    documentType: row.documentType,
    label: row.label,
    fileName: row.fileName,
    mimeType: row.mimeType,
    bytes: row.bytes,
    previewUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function removeDocumentAsset(row: {
  publicId: string;
  resourceType: string | null;
}) {
  if (!isCloudinaryConfigured()) return;
  await cloudinaryService.deleteAsset(
    row.publicId,
    (row.resourceType as UploadResult["resourceType"]) ?? "auto",
  );
}

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/documents",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const rows = await db
      .select()
      .from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.studentId, studentId));

    return res.json({ data: rows.map(mapDocumentRow), total: rows.length });
  },
);

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/documents/:documentId/preview",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const documentId = Number(req.params.documentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [row] = await db
      .select()
      .from(studentDocumentsTable)
      .where(
        and(
          eq(studentDocumentsTable.id, documentId),
          eq(studentDocumentsTable.studentId, studentId),
        ),
      )
      .limit(1);

    if (!row) return res.status(404).json({ error: "Document not found" });

    const previewUrl = isCloudinaryConfigured()
      ? cloudinaryService.getSecureUrl(row.publicId)
      : row.secureUrl;
    if (!previewUrl) return res.status(404).json({ error: "Preview unavailable" });

    return res.json({
      id: row.id,
      documentType: row.documentType,
      fileName: row.fileName,
      mimeType: row.mimeType,
      previewUrl,
    });
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/documents",
  uploadMiddleware.single("file"),
  async (req, res) => {
    try {
      assertMediaUploadReady();
    } catch {
      return res.status(503).json({ error: "Cloudinary is not configured for uploads" });
    }

    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const file = req.file;

    if (!file) return res.status(400).json({ error: "file is required" });

    const typeParsed = StudentDocumentTypeBody.safeParse(req.body.documentType);
    if (!typeParsed.success) return res.status(400).json({ error: "Invalid documentType" });

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const documentType = typeParsed.data;
    const label = typeof req.body.label === "string" ? req.body.label : undefined;

    if (SINGLE_TYPES.has(documentType)) {
      const existing = await db
        .select()
        .from(studentDocumentsTable)
        .where(
          and(
            eq(studentDocumentsTable.studentId, studentId),
            eq(studentDocumentsTable.documentType, documentType),
          ),
        );

      for (const row of existing) {
        await removeDocumentAsset(row);
        await db.delete(studentDocumentsTable).where(eq(studentDocumentsTable.id, row.id));
      }
    }

    const upload = await cloudinaryService.uploadStudentDocument(file.buffer, {
      societyId: student.societyId,
      schoolId: student.schoolId,
      branchId: student.branchId,
      sessionId: student.sessionId,
      studentId: student.id,
      documentType,
      filename: file.originalname,
    });

    const [doc] = await db
      .insert(studentDocumentsTable)
      .values({
        studentId,
        documentType,
        label: documentType === "other" ? label ?? file.originalname : null,
        publicId: upload.publicId,
        secureUrl: upload.secureUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        resourceType: upload.resourceType,
        bytes: upload.bytes,
      })
      .returning();

    if (documentType === "student_photo") {
      await db
        .update(studentsTable)
        .set({ photoUrl: upload.secureUrl })
        .where(eq(studentsTable.id, studentId));
    }

    return res.status(201).json(mapDocumentRow(doc));
  },
);

router.put(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/documents/:documentId",
  uploadMiddleware.single("file"),
  async (req, res) => {
    try {
      assertMediaUploadReady();
    } catch {
      return res.status(503).json({ error: "Cloudinary is not configured for uploads" });
    }

    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const documentId = Number(req.params.documentId);
    const file = req.file;

    if (!file) return res.status(400).json({ error: "file is required" });

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [existing] = await db
      .select()
      .from(studentDocumentsTable)
      .where(
        and(
          eq(studentDocumentsTable.id, documentId),
          eq(studentDocumentsTable.studentId, studentId),
        ),
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Document not found" });

    await removeDocumentAsset(existing);

    const upload = await cloudinaryService.uploadStudentDocument(file.buffer, {
      societyId: student.societyId,
      schoolId: student.schoolId,
      branchId: student.branchId,
      sessionId: student.sessionId,
      studentId: student.id,
      documentType: existing.documentType,
      filename: file.originalname,
    });

    const [doc] = await db
      .update(studentDocumentsTable)
      .set({
        publicId: upload.publicId,
        secureUrl: upload.secureUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        resourceType: upload.resourceType,
        bytes: upload.bytes,
      })
      .where(eq(studentDocumentsTable.id, documentId))
      .returning();

    if (existing.documentType === "student_photo") {
      await db
        .update(studentsTable)
        .set({ photoUrl: upload.secureUrl })
        .where(eq(studentsTable.id, studentId));
    }

    return res.json(mapDocumentRow(doc));
  },
);

router.delete(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/documents/:documentId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const documentId = Number(req.params.documentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [existing] = await db
      .select()
      .from(studentDocumentsTable)
      .where(
        and(
          eq(studentDocumentsTable.id, documentId),
          eq(studentDocumentsTable.studentId, studentId),
        ),
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Document not found" });

    await removeDocumentAsset(existing);
    await db.delete(studentDocumentsTable).where(eq(studentDocumentsTable.id, documentId));

    if (existing.documentType === "student_photo") {
      await db
        .update(studentsTable)
        .set({ photoUrl: null })
        .where(eq(studentsTable.id, studentId));
    }

    return res.json({ message: "Document deleted" });
  },
);

export default router;
