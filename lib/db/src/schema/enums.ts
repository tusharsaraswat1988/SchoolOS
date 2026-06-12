import { pgEnum } from "drizzle-orm/pg-core";

export const entityStatusEnum = pgEnum("org_entity_status", [
  "active",
  "inactive",
  "archived",
]);

export const roleScopeEnum = pgEnum("system_role_scope", [
  "platform",
  "society",
  "school",
  "branch",
]);

export const userStatusEnum = pgEnum("system_user_status", [
  "active",
  "inactive",
  "blocked",
]);

export const restrictionEntityTypeEnum = pgEnum("restriction_entity_type", [
  "branch",
  "session",
  "class",
  "section",
  "student",
]);

export const otpChannelEnum = pgEnum("otp_channel", ["sms", "whatsapp", "voice"]);

export const otpPurposeEnum = pgEnum("otp_purpose", ["login", "verify_mobile"]);

export const otpStatusEnum = pgEnum("otp_status", [
  "issued",
  "verified",
  "expired",
  "consumed",
  "failed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "user_created",
  "user_updated",
  "student_created",
  "student_updated",
  "student_transfer",
  "attendance_action",
  "fee_action",
  "permission_changed",
  "settings_changed",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "inactive",
  "transferred",
  "graduated",
  "left",
  "tc_issued",
  "alumni",
  "suspended",
]);

export const relationshipEnum = pgEnum("parent_relationship", [
  "father",
  "mother",
  "guardian",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "father",
  "mother",
  "guardian",
  "local_guardian",
  "other",
]);

export const documentEntityTypeEnum = pgEnum("document_entity_type", [
  "student",
  "staff",
  "teacher",
  "driver",
  "vehicle",
  "vendor",
]);

export const documentVerificationStatusEnum = pgEnum("document_verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const feeStatusEnum = pgEnum("fee_status", [
  "pending",
  "partial",
  "paid",
  "overdue",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "online",
  "cheque",
  "upi",
  "card",
]);

export const announcementAudienceEnum = pgEnum("audience", [
  "all",
  "teachers",
  "students",
  "parents",
]);

export const announcementPriorityEnum = pgEnum("priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const schoolCategoryEnum = pgEnum("school_category", [
  "primary",
  "upper_primary",
  "secondary",
  "higher_secondary",
  "composite",
]);

export const schoolTypeEnum = pgEnum("school_type", [
  "boys",
  "girls",
  "co_educational",
]);

export const managementTypeEnum = pgEnum("management_type", [
  "government",
  "local_body",
  "private_aided",
  "private_unaided",
  "central_govt",
  "state_govt",
  "other",
]);

export const recognitionStatusEnum = pgEnum("recognition_status", [
  "recognized",
  "unrecognized",
  "provisional",
]);

export const socialCategoryEnum = pgEnum("social_category", [
  "general",
  "sc",
  "st",
  "obc",
  "other",
]);

export const staffTypeEnum = pgEnum("staff_type", ["teaching", "non_teaching"]);

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "regular",
  "contract",
  "guest",
]);

export const examAssessmentModeEnum = pgEnum("exam_assessment_mode", [
  "marks",
  "grade",
  "both",
]);

export const udiseExportStatusEnum = pgEnum("udise_export_status", [
  "draft",
  "ready",
  "exported",
  "submitted",
]);

export const studentDocumentTypeEnum = pgEnum("student_document_type", [
  "student_photo",
  "birth_certificate",
  "aadhaar",
  "transfer_certificate",
  "other",
]);

export const admissionLeadSourceEnum = pgEnum("admission_lead_source", [
  "walk_in",
  "phone_inquiry",
  "website",
  "social_media",
  "referral",
  "camp_event",
  "newspaper",
  "hoarding",
  "agent",
  "existing_parent",
  "other",
]);

export const admissionLeadStatusEnum = pgEnum("admission_lead_status", [
  "new",
  "contacted",
  "follow_up",
  "visited",
  "converted",
  "lost",
]);

export const admissionLeadLostReasonEnum = pgEnum("admission_lead_lost_reason", [
  "fee_too_high",
  "joined_other_school",
  "location",
  "timing",
  "no_response",
  "changed_mind",
  "other",
]);

export const admissionLeadContactMethodEnum = pgEnum("admission_lead_contact_method", [
  "call",
  "whatsapp",
  "sms",
  "email",
  "in_person",
  "other",
]);

/** Billing MVP-A — Sprint 1 */
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "published",
  "partially_paid",
  "paid",
  "cancelled",
]);

export const billingRunStatusEnum = pgEnum("billing_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const discountKindEnum = pgEnum("billing_discount_kind", ["fixed", "percent"]);

export const sequenceTypeEnum = pgEnum("billing_sequence_type", [
  "invoice",
  "receipt",
  "payment",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "charge",
  "payment",
  "discount",
  "advance",
]);

export const ledgerDirectionEnum = pgEnum("ledger_direction", ["debit", "credit"]);
