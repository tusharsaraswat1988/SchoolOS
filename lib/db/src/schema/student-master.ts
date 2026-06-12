import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";
import {
  documentEntityTypeEnum,
  documentVerificationStatusEnum,
  relationTypeEnum,
} from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";

/** Reusable person relation entity — not hardcoded to father/mother only. */
export const personRelationsTable = pgTable(
  "person_relations",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    relationType: relationTypeEnum("relation_type").notNull(),
    mobile: text("mobile"),
    alternateMobile: text("alternate_mobile"),
    email: text("email"),
    aadhaar: text("aadhaar"),
    pan: text("pan"),
    occupation: text("occupation"),
    photoUrl: text("photo_url"),
    currentAddressLine1: text("current_address_line1"),
    currentAddressLine2: text("current_address_line2"),
    currentLandmark: text("current_landmark"),
    currentCity: text("current_city"),
    currentState: text("current_state"),
    currentCountry: text("current_country"),
    currentPinCode: text("current_pin_code"),
    permanentSameAsCurrent: boolean("permanent_same_as_current").notNull().default(false),
    permanentAddressLine1: text("permanent_address_line1"),
    permanentAddressLine2: text("permanent_address_line2"),
    permanentLandmark: text("permanent_landmark"),
    permanentCity: text("permanent_city"),
    permanentState: text("permanent_state"),
    permanentCountry: text("permanent_country"),
    permanentPinCode: text("permanent_pin_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    branchIdx: index("person_relations_branch_idx").on(table.branchId),
  }),
);

/** Links a student to a person relation record. */
export const studentRelationMappingsTable = pgTable(
  "student_relation_mappings",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    relationId: integer("relation_id")
      .notNull()
      .references(() => personRelationsTable.id, { onDelete: "cascade" }),
    relationType: relationTypeEnum("relation_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentRelationUq: uniqueIndex("student_relation_mappings_uq").on(
      table.studentId,
      table.relationId,
    ),
    studentIdx: index("student_relation_mappings_student_idx").on(table.studentId),
  }),
);

/** Bidirectional sibling link — studentIdA is always the lower id. */
export const siblingMappingsTable = pgTable(
  "sibling_mappings",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    studentIdA: integer("student_id_a")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    studentIdB: integer("student_id_b")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by"),
  },
  (table) => ({
    siblingPairUq: uniqueIndex("sibling_mappings_pair_uq").on(table.studentIdA, table.studentIdB),
    studentAIdx: index("sibling_mappings_student_a_idx").on(table.studentIdA),
    studentBIdx: index("sibling_mappings_student_b_idx").on(table.studentIdB),
  }),
);

/** School-level document type definitions. */
export const documentMasterTable = pgTable(
  "document_master",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    applicableModules: jsonb("applicable_modules").$type<string[]>().notNull().default([]),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    allowExpiryDate: boolean("allow_expiry_date").notNull().default(false),
    allowDocumentNumber: boolean("allow_document_number").notNull().default(false),
    allowedFileTypes: jsonb("allowed_file_types").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    schoolNameUq: uniqueIndex("document_master_school_name_uq").on(table.schoolId, table.name),
    schoolIdx: index("document_master_school_idx").on(table.schoolId),
  }),
);

/** Universal document storage for any entity type. */
export const documentsTable = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id")
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    entityType: documentEntityTypeEnum("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    documentMasterId: integer("document_master_id")
      .notNull()
      .references(() => documentMasterTable.id, { onDelete: "restrict" }),
    documentNumber: text("document_number"),
    publicId: text("public_id"),
    secureUrl: text("secure_url"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    resourceType: text("resource_type").default("auto"),
    bytes: integer("bytes"),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    remarks: text("remarks"),
    verificationStatus: documentVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    entityIdx: index("documents_entity_idx").on(table.entityType, table.entityId),
    masterIdx: index("documents_master_idx").on(table.documentMasterId),
    publicIdUq: uniqueIndex("documents_public_id_uq").on(table.publicId),
  }),
);

/** Verification audit trail for documents. */
export const documentVerificationsTable = pgTable(
  "document_verifications",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documentsTable.id, { onDelete: "cascade" }),
    status: documentVerificationStatusEnum("status").notNull(),
    verifiedBy: integer("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("document_verifications_document_idx").on(table.documentId),
  }),
);

/** Primary (and future secondary) communication contact for a student. */
export const communicationPreferencesTable = pgTable(
  "communication_preferences",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    primaryRelationId: integer("primary_relation_id")
      .notNull()
      .references(() => personRelationsTable.id, { onDelete: "restrict" }),
    primaryRelationType: relationTypeEnum("primary_relation_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentUq: uniqueIndex("communication_preferences_student_uq").on(table.studentId),
  }),
);

export const PRIMARY_COMMUNICATION_RELATION_TYPES = [
  "father",
  "mother",
  "guardian",
  "local_guardian",
] as const;

export type PrimaryCommunicationRelationType =
  (typeof PRIMARY_COMMUNICATION_RELATION_TYPES)[number];
