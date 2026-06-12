import { Router } from "express";
import {
  classesTable,
  db,
  documentMasterTable,
  documentsTable,
  sectionsTable,
  studentsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { resolveSessionScope } from "../lib/scope";
import { studentListSelect } from "../lib/student-select";

const router = Router();

router.get(
  "/branches/:branchId/sessions/:sessionId/students/document-dashboard",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const filter = req.query.filter as string | undefined;
    const classId = req.query.classId ? Number(req.query.classId) : undefined;

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
    const mandatoryMasterIds = new Set(
      studentMasters.filter((m) => m.isMandatory).map((m) => m.id),
    );

    const conditions = [
      eq(studentsTable.branchId, branchId),
      eq(studentsTable.sessionId, sessionId),
      eq(studentsTable.status, "active"),
    ];
    if (classId) conditions.push(eq(studentsTable.classId, classId));

    const students = await db
      .select(studentListSelect)
      .from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .leftJoin(sectionsTable, eq(studentsTable.sectionId, sectionsTable.id))
      .where(and(...conditions));

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) {
      return res.json({
        data: [],
        summary: {
          totalStudents: 0,
          fullyComplete: 0,
          withMissing: 0,
          withExpired: 0,
          withPending: 0,
          withRejected: 0,
        },
      });
    }

    const uploadedDocs = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.entityType, "student"),
          inArray(documentsTable.entityId, studentIds),
        ),
      );

    const docsByStudent = new Map<number, (typeof uploadedDocs)[number][]>();
    for (const doc of uploadedDocs) {
      const list = docsByStudent.get(doc.entityId) ?? [];
      list.push(doc);
      docsByStudent.set(doc.entityId, list);
    }

    const today = new Date(new Date().toDateString());

    const rows = students.map((s) => {
      const docs = docsByStudent.get(s.id) ?? [];
      const uploadedMasterIds = new Set(docs.map((d) => d.documentMasterId));

      let missingMandatory = 0;
      for (const mid of mandatoryMasterIds) {
        if (!uploadedMasterIds.has(mid)) missingMandatory += 1;
      }

      const expired = docs.filter(
        (d) => d.expiryDate != null && new Date(d.expiryDate) < today,
      ).length;
      const pending = docs.filter((d) => d.verificationStatus === "pending").length;
      const rejected = docs.filter((d) => d.verificationStatus === "rejected").length;

      const mandatoryTotal = mandatoryMasterIds.size;
      const mandatoryUploaded = mandatoryTotal - missingMandatory;
      const completionPercent =
        mandatoryTotal > 0 ? Math.round((mandatoryUploaded / mandatoryTotal) * 100) : 100;

      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        registrationNumber: s.registrationNumber,
        className: s.className,
        sectionName: s.sectionName,
        missingMandatory,
        expired,
        pendingVerification: pending,
        rejected,
        completionPercent,
        status:
          missingMandatory > 0
            ? "missing"
            : expired > 0
              ? "expired"
              : pending > 0
                ? "pending"
                : rejected > 0
                  ? "rejected"
                  : "complete",
      };
    });

    let filtered = rows;
    if (filter === "missing") filtered = rows.filter((r) => r.missingMandatory > 0);
    else if (filter === "expired") filtered = rows.filter((r) => r.expired > 0);
    else if (filter === "pending") filtered = rows.filter((r) => r.pendingVerification > 0);
    else if (filter === "rejected") filtered = rows.filter((r) => r.rejected > 0);
    else if (filter === "incomplete") filtered = rows.filter((r) => r.completionPercent < 100);

    return res.json({
      data: filtered,
      summary: {
        totalStudents: rows.length,
        fullyComplete: rows.filter((r) => r.status === "complete").length,
        withMissing: rows.filter((r) => r.missingMandatory > 0).length,
        withExpired: rows.filter((r) => r.expired > 0).length,
        withPending: rows.filter((r) => r.pendingVerification > 0).length,
        withRejected: rows.filter((r) => r.rejected > 0).length,
      },
    });
  },
);

export default router;
