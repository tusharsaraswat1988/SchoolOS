import { and, eq } from "drizzle-orm";
import type { db as DbType } from "./index";
import {
  communicationPreferencesTable,
  documentMasterTable,
  personRelationsTable,
  studentRelationMappingsTable,
  studentsTable,
} from "./schema";

type Db = typeof DbType;
type StudentRow = typeof studentsTable.$inferSelect;

type Scope = {
  societyId: number;
  schoolId: number;
  branchId: number;
};

const SKIP_NAMES = new Set(["na", "n/a", "none", "-", ""]);

function isValidName(name: string | null | undefined): name is string {
  if (!name?.trim()) return false;
  return !SKIP_NAMES.has(name.trim().toLowerCase());
}

async function createRelationMapping(
  database: Db,
  student: StudentRow,
  scope: Scope,
  relationType: "father" | "mother" | "guardian",
  fullName: string,
  mobile?: string | null,
  email?: string | null,
) {
  const [relation] = await database
    .insert(personRelationsTable)
    .values({
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      fullName,
      relationType,
      mobile: mobile ?? null,
      email: email ?? null,
      currentAddressLine1: student.address !== "NA" ? student.address : null,
    })
    .returning();

  await database.insert(studentRelationMappingsTable).values({
    studentId: student.id,
    relationId: relation.id,
    relationType,
  });

  return relation;
}

export async function syncLegacyParentRelations(
  database: Db,
  student: StudentRow,
  scope: Scope,
) {
  const [existing] = await database
    .select({ id: studentRelationMappingsTable.id })
    .from(studentRelationMappingsTable)
    .where(eq(studentRelationMappingsTable.studentId, student.id))
    .limit(1);

  if (existing) return;

  let fatherRelation: typeof personRelationsTable.$inferSelect | null = null;
  let motherRelation: typeof personRelationsTable.$inferSelect | null = null;

  if (isValidName(student.fatherName)) {
    fatherRelation = await createRelationMapping(
      database,
      student,
      scope,
      "father",
      student.fatherName,
      student.parentMobile,
      student.parentEmail,
    );
  }

  if (isValidName(student.motherName)) {
    motherRelation = await createRelationMapping(
      database,
      student,
      scope,
      "mother",
      student.motherName,
      student.parentMobile,
      student.parentEmail,
    );
  }

  if (isValidName(student.guardianName)) {
    await createRelationMapping(
      database,
      student,
      scope,
      "guardian",
      student.guardianName!,
      student.parentMobile,
      student.parentEmail,
    );
  }

  const primary = fatherRelation ?? motherRelation;
  if (primary) {
    const [commExisting] = await database
      .select()
      .from(communicationPreferencesTable)
      .where(eq(communicationPreferencesTable.studentId, student.id))
      .limit(1);

    if (!commExisting) {
      await database.insert(communicationPreferencesTable).values({
        studentId: student.id,
        primaryRelationId: primary.id,
        primaryRelationType: primary.relationType as "father" | "mother",
      });
    }
  }
}

const DEFAULT_DOCUMENT_TYPES = [
  { name: "Aadhaar Card", isMandatory: true, allowDocumentNumber: true },
  { name: "Birth Certificate", isMandatory: true },
  { name: "Transfer Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "Previous School TC", isMandatory: false },
  { name: "Caste Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "Income Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "RTE Proof", isMandatory: false },
  { name: "Passport", isMandatory: false, allowExpiryDate: true, allowDocumentNumber: true },
  { name: "Medical Certificate", isMandatory: false, allowExpiryDate: true },
] as const;

export async function seedDocumentMasterForSchool(
  database: Db,
  societyId: number,
  schoolId: number,
) {
  for (const doc of DEFAULT_DOCUMENT_TYPES) {
    const [existing] = await database
      .select({ id: documentMasterTable.id })
      .from(documentMasterTable)
      .where(and(eq(documentMasterTable.schoolId, schoolId), eq(documentMasterTable.name, doc.name)))
      .limit(1);

    if (existing) continue;

    await database.insert(documentMasterTable).values({
      societyId,
      schoolId,
      name: doc.name,
      applicableModules: ["student"],
      isMandatory: doc.isMandatory,
      allowExpiryDate: "allowExpiryDate" in doc ? (doc.allowExpiryDate ?? false) : false,
      allowDocumentNumber: "allowDocumentNumber" in doc ? (doc.allowDocumentNumber ?? false) : false,
      allowedFileTypes: ["pdf", "jpg", "jpeg", "png"],
    });
  }
}
