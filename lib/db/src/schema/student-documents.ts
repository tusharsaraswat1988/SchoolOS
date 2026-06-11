import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { studentDocumentTypeEnum } from "./enums";
import { studentsTable } from "./students";

export const studentDocumentsTable = pgTable(
  "student_documents",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    documentType: studentDocumentTypeEnum("document_type").notNull(),
    label: text("label"),
    publicId: text("public_id").notNull(),
    secureUrl: text("secure_url"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    resourceType: text("resource_type").notNull().default("auto"),
    bytes: integer("bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentPublicIdUq: uniqueIndex("student_documents_public_id_uq").on(table.publicId),
  }),
);

export const SINGLE_STUDENT_DOCUMENT_TYPES = [
  "student_photo",
  "birth_certificate",
  "aadhaar",
  "transfer_certificate",
] as const;

export type SingleStudentDocumentType = (typeof SINGLE_STUDENT_DOCUMENT_TYPES)[number];
