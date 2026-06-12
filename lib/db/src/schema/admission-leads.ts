import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import {
  admissionLeadContactMethodEnum,
  admissionLeadLostReasonEnum,
  admissionLeadSourceEnum,
  admissionLeadStatusEnum,
} from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const admissionLeadsTable = pgTable(
  "admission_leads",
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
    sessionId: integer("session_id")
      .notNull()
      .references(() => academicSessionsTable.id, { onDelete: "cascade" }),
    childName: text("child_name").notNull(),
    parentName: text("parent_name").notNull(),
    parentPhone: text("parent_phone").notNull(),
    parentEmail: text("parent_email"),
    source: admissionLeadSourceEnum("source").notNull().default("other"),
    sourceDetail: text("source_detail"),
    interestedClassId: integer("interested_class_id").references(() => classesTable.id, {
      onDelete: "set null",
    }),
    status: admissionLeadStatusEnum("status").notNull().default("new"),
    initialInquiryNotes: text("initial_inquiry_notes"),
    lostReason: admissionLeadLostReasonEnum("lost_reason"),
    lostReasonNotes: text("lost_reason_notes"),
    convertedStudentId: integer("converted_student_id").references(() => studentsTable.id, {
      onDelete: "set null",
    }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    assignedToUserId: integer("assigned_to_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    branchSessionStatusIdx: index("admission_leads_branch_session_status_idx").on(
      table.branchId,
      table.sessionId,
      table.status,
    ),
    branchSessionSourceIdx: index("admission_leads_branch_session_source_idx").on(
      table.branchId,
      table.sessionId,
      table.source,
    ),
    nextFollowUpIdx: index("admission_leads_next_follow_up_idx").on(
      table.branchId,
      table.nextFollowUpAt,
    ),
  }),
);

export const admissionLeadFollowUpsTable = pgTable(
  "admission_lead_follow_ups",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => admissionLeadsTable.id, { onDelete: "cascade" }),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => academicSessionsTable.id, { onDelete: "cascade" }),
    contactMethod: admissionLeadContactMethodEnum("contact_method").notNull().default("call"),
    contactedAt: timestamp("contacted_at", { withTimezone: true }).notNull().defaultNow(),
    discussionSummary: text("discussion_summary").notNull(),
    theirResponse: text("their_response"),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by"),
  },
  (table) => ({
    leadContactedAtIdx: index("admission_lead_follow_ups_lead_contacted_idx").on(
      table.leadId,
      table.contactedAt,
    ),
  }),
);
