import { Router } from "express";
import {
  communicationPreferencesTable,
  db,
  personRelationsTable,
  siblingMappingsTable,
  studentRelationMappingsTable,
  studentsTable,
} from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveSessionScope } from "../lib/scope";
import {
  calculateAge,
  canonicalSiblingPair,
  getStudentInSession,
} from "../lib/student-scope";

const router = Router();

const relationTypeValues = [
  "father",
  "mother",
  "guardian",
  "local_guardian",
  "other",
] as const;

const primaryContactTypes = ["father", "mother", "guardian", "local_guardian"] as const;

const AddressBody = z.object({
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pinCode: z.string().optional().nullable(),
});

const RelationBody = z.object({
  fullName: z.string().min(1),
  relationType: z.enum(relationTypeValues),
  mobile: z.string().optional().nullable(),
  alternateMobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  aadhaar: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  currentAddress: AddressBody.optional(),
  permanentSameAsCurrent: z.boolean().optional(),
  permanentAddress: AddressBody.optional(),
});

function mapCurrentAddress(addr?: z.infer<typeof AddressBody> | null) {
  if (!addr) return {};
  return {
    currentAddressLine1: addr.addressLine1 ?? null,
    currentAddressLine2: addr.addressLine2 ?? null,
    currentLandmark: addr.landmark ?? null,
    currentCity: addr.city ?? null,
    currentState: addr.state ?? null,
    currentCountry: addr.country ?? null,
    currentPinCode: addr.pinCode ?? null,
  };
}

function mapPermanentAddress(addr?: z.infer<typeof AddressBody> | null) {
  if (!addr) return {};
  return {
    permanentAddressLine1: addr.addressLine1 ?? null,
    permanentAddressLine2: addr.addressLine2 ?? null,
    permanentLandmark: addr.landmark ?? null,
    permanentCity: addr.city ?? null,
    permanentState: addr.state ?? null,
    permanentCountry: addr.country ?? null,
    permanentPinCode: addr.pinCode ?? null,
  };
}

function mapRelationResponse(
  relation: typeof personRelationsTable.$inferSelect,
  mappingId?: number,
) {
  return {
    id: relation.id,
    mappingId,
    fullName: relation.fullName,
    relationType: relation.relationType,
    mobile: relation.mobile,
    alternateMobile: relation.alternateMobile,
    email: relation.email,
    aadhaar: relation.aadhaar,
    pan: relation.pan,
    occupation: relation.occupation,
    photoUrl: relation.photoUrl,
    currentAddress: {
      addressLine1: relation.currentAddressLine1,
      addressLine2: relation.currentAddressLine2,
      landmark: relation.currentLandmark,
      city: relation.currentCity,
      state: relation.currentState,
      country: relation.currentCountry,
      pinCode: relation.currentPinCode,
    },
    permanentSameAsCurrent: relation.permanentSameAsCurrent,
    permanentAddress: {
      addressLine1: relation.permanentAddressLine1,
      addressLine2: relation.permanentAddressLine2,
      landmark: relation.permanentLandmark,
      city: relation.permanentCity,
      state: relation.permanentState,
      country: relation.permanentCountry,
      pinCode: relation.permanentPinCode,
    },
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

// ─── Relations ───────────────────────────────────────────────────────────────

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/relations",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const rows = await db
      .select({
        mapping: studentRelationMappingsTable,
        relation: personRelationsTable,
      })
      .from(studentRelationMappingsTable)
      .innerJoin(
        personRelationsTable,
        eq(studentRelationMappingsTable.relationId, personRelationsTable.id),
      )
      .where(eq(studentRelationMappingsTable.studentId, studentId));

    const [commPref] = await db
      .select()
      .from(communicationPreferencesTable)
      .where(eq(communicationPreferencesTable.studentId, studentId))
      .limit(1);

    return res.json({
      data: rows.map((r) => mapRelationResponse(r.relation, r.mapping.id)),
      primaryCommunicationContact: commPref
        ? {
            relationId: commPref.primaryRelationId,
            relationType: commPref.primaryRelationType,
          }
        : null,
    });
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/relations",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const parsed = RelationBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const body = parsed.data;
    const [relation] = await db
      .insert(personRelationsTable)
      .values({
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
        fullName: body.fullName,
        relationType: body.relationType,
        mobile: body.mobile ?? null,
        alternateMobile: body.alternateMobile ?? null,
        email: body.email ?? null,
        aadhaar: body.aadhaar ?? null,
        pan: body.pan ?? null,
        occupation: body.occupation ?? null,
        photoUrl: body.photoUrl ?? null,
        permanentSameAsCurrent: body.permanentSameAsCurrent ?? false,
        ...mapCurrentAddress(body.currentAddress),
        ...mapPermanentAddress(body.permanentAddress),
      })
      .returning();

    const [mapping] = await db
      .insert(studentRelationMappingsTable)
      .values({
        studentId,
        relationId: relation.id,
        relationType: body.relationType,
      })
      .returning();

    return res.status(201).json(mapRelationResponse(relation, mapping.id));
  },
);

router.patch(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/relations/:relationId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const relationId = Number(req.params.relationId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [mapping] = await db
      .select()
      .from(studentRelationMappingsTable)
      .where(
        and(
          eq(studentRelationMappingsTable.studentId, studentId),
          eq(studentRelationMappingsTable.relationId, relationId),
        ),
      )
      .limit(1);

    if (!mapping) return res.status(404).json({ error: "Relation not found" });

    const parsed = RelationBody.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const body = parsed.data;
    const [relation] = await db
      .update(personRelationsTable)
      .set({
        ...(body.fullName != null ? { fullName: body.fullName } : {}),
        ...(body.relationType != null ? { relationType: body.relationType } : {}),
        ...(body.mobile !== undefined ? { mobile: body.mobile } : {}),
        ...(body.alternateMobile !== undefined ? { alternateMobile: body.alternateMobile } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.aadhaar !== undefined ? { aadhaar: body.aadhaar } : {}),
        ...(body.pan !== undefined ? { pan: body.pan } : {}),
        ...(body.occupation !== undefined ? { occupation: body.occupation } : {}),
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
        ...(body.permanentSameAsCurrent !== undefined
          ? { permanentSameAsCurrent: body.permanentSameAsCurrent }
          : {}),
        ...(body.currentAddress ? mapCurrentAddress(body.currentAddress) : {}),
        ...(body.permanentAddress ? mapPermanentAddress(body.permanentAddress) : {}),
      })
      .where(eq(personRelationsTable.id, relationId))
      .returning();

    if (body.relationType) {
      await db
        .update(studentRelationMappingsTable)
        .set({ relationType: body.relationType })
        .where(eq(studentRelationMappingsTable.id, mapping.id));
    }

    return res.json(mapRelationResponse(relation, mapping.id));
  },
);

router.delete(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/relations/:relationId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const relationId = Number(req.params.relationId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [mapping] = await db
      .select()
      .from(studentRelationMappingsTable)
      .where(
        and(
          eq(studentRelationMappingsTable.studentId, studentId),
          eq(studentRelationMappingsTable.relationId, relationId),
        ),
      )
      .limit(1);

    if (!mapping) return res.status(404).json({ error: "Relation not found" });

    await db
      .delete(studentRelationMappingsTable)
      .where(eq(studentRelationMappingsTable.id, mapping.id));

    const otherMappings = await db
      .select()
      .from(studentRelationMappingsTable)
      .where(eq(studentRelationMappingsTable.relationId, relationId))
      .limit(1);

    if (otherMappings.length === 0) {
      await db.delete(personRelationsTable).where(eq(personRelationsTable.id, relationId));
    }

    return res.json({ message: "Relation removed" });
  },
);

// ─── Communication Preferences ───────────────────────────────────────────────

router.put(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/communication-preference",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const parsed = z
      .object({
        primaryRelationId: z.number().int().positive(),
        primaryRelationType: z.enum(primaryContactTypes),
      })
      .safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [mapping] = await db
      .select()
      .from(studentRelationMappingsTable)
      .where(
        and(
          eq(studentRelationMappingsTable.studentId, studentId),
          eq(studentRelationMappingsTable.relationId, parsed.data.primaryRelationId),
        ),
      )
      .limit(1);

    if (!mapping) {
      return res.status(400).json({ error: "Selected relation is not linked to this student" });
    }

    const [existing] = await db
      .select()
      .from(communicationPreferencesTable)
      .where(eq(communicationPreferencesTable.studentId, studentId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(communicationPreferencesTable)
        .set({
          primaryRelationId: parsed.data.primaryRelationId,
          primaryRelationType: parsed.data.primaryRelationType,
        })
        .where(eq(communicationPreferencesTable.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(communicationPreferencesTable)
      .values({
        studentId,
        primaryRelationId: parsed.data.primaryRelationId,
        primaryRelationType: parsed.data.primaryRelationType,
      })
      .returning();

    return res.status(201).json(created);
  },
);

// ─── Siblings ────────────────────────────────────────────────────────────────

router.get(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/siblings",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const mappings = await db
      .select()
      .from(siblingMappingsTable)
      .where(
        or(
          eq(siblingMappingsTable.studentIdA, studentId),
          eq(siblingMappingsTable.studentIdB, studentId),
        ),
      );

    const siblingIds = mappings.map((m) =>
      m.studentIdA === studentId ? m.studentIdB : m.studentIdA,
    );

    if (siblingIds.length === 0) return res.json({ data: [] });

    const siblings = await db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        admissionNumber: studentsTable.admissionNumber,
        registrationNumber: studentsTable.registrationNumber,
        classId: studentsTable.classId,
        sectionId: studentsTable.sectionId,
        status: studentsTable.status,
        dob: studentsTable.dob,
      })
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.branchId, branchId),
          eq(studentsTable.sessionId, sessionId),
          inArray(studentsTable.id, siblingIds),
        ),
      );

    return res.json({
      data: siblings.map((s) => ({
        ...s,
        fullName: `${s.firstName} ${s.lastName}`,
        age: calculateAge(s.dob),
      })),
    });
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/siblings",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);

    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const parsed = z.object({ siblingStudentId: z.number().int().positive() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const siblingId = parsed.data.siblingStudentId;
    if (siblingId === studentId) {
      return res.status(400).json({ error: "Cannot link student to themselves" });
    }

    const sibling = await getStudentInSession(branchId, sessionId, siblingId);
    if (!sibling) return res.status(404).json({ error: "Sibling student not found" });

    const [idA, idB] = canonicalSiblingPair(studentId, siblingId);

    const [existing] = await db
      .select()
      .from(siblingMappingsTable)
      .where(
        and(
          eq(siblingMappingsTable.studentIdA, idA),
          eq(siblingMappingsTable.studentIdB, idB),
        ),
      )
      .limit(1);

    if (existing) return res.status(409).json({ error: "Sibling link already exists" });

    const [mapping] = await db
      .insert(siblingMappingsTable)
      .values({
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
        studentIdA: idA,
        studentIdB: idB,
      })
      .returning();

    return res.status(201).json({
      id: mapping.id,
      siblingStudentId: siblingId,
      siblingName: `${sibling.firstName} ${sibling.lastName}`,
    });
  },
);

router.delete(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/siblings/:siblingId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const studentId = Number(req.params.studentId);
    const siblingId = Number(req.params.siblingId);

    const student = await getStudentInSession(branchId, sessionId, studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [idA, idB] = canonicalSiblingPair(studentId, siblingId);

    await db
      .delete(siblingMappingsTable)
      .where(
        and(
          eq(siblingMappingsTable.studentIdA, idA),
          eq(siblingMappingsTable.studentIdB, idB),
        ),
      );

    return res.json({ message: "Sibling link removed" });
  },
);

export default router;
