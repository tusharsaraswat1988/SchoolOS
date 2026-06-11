import { z } from "zod/v4";

export const SchoolProfileBody = z.object({
  udiseCode: z.string().optional(),
  schoolCategory: z
    .enum(["primary", "upper_primary", "secondary", "higher_secondary", "composite"])
    .optional(),
  schoolType: z.enum(["boys", "girls", "co_educational"]).optional(),
  managementType: z
    .enum(["government", "local_body", "private_aided", "private_unaided", "central_govt", "state_govt", "other"])
    .optional(),
  managementCode: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  block: z.string().optional(),
  village: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  principalName: z.string().optional(),
  principalMobile: z.string().optional(),
  principalEmail: z.string().email().optional().or(z.literal("")),
  yearOfEstablishment: z.number().int().optional(),
  recognitionStatus: z.enum(["recognized", "unrecognized", "provisional"]).optional(),
  affiliationBoard: z.string().optional(),
  affiliationBoardName: z.string().optional(),
  affiliationNumber: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  languageGroups: z.array(z.string()).optional(),
  minoritySchoolFlag: z.boolean().optional(),
  residentialSchoolFlag: z.boolean().optional(),
  prePrimaryAvailable: z.boolean().optional(),
  lowestClass: z.string().optional(),
  highestClass: z.string().optional(),
  streamsAvailable: z
    .object({
      science: z.boolean().optional(),
      commerce: z.boolean().optional(),
      arts: z.boolean().optional(),
      vocational: z.boolean().optional(),
    })
    .optional(),
});

export const StaffProfileBody = z.object({
  employeeId: z.string().optional(),
  email: z.string().email("Staff email is required"),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  joiningDate: z.string().optional(),
  designation: z.string().optional(),
  staffType: z.enum(["teaching", "non_teaching"]).optional(),
  qualification: z.string().optional(),
  professionalQualification: z.string().optional(),
  subjectsTaught: z.array(z.string()).optional(),
  appointmentType: z.enum(["regular", "contract", "guest"]).optional(),
  salaryReference: z.string().optional(),
});

export const CreateSubjectBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});

export const CreateClassSubjectBody = z.object({
  subjectId: z.number().int(),
  isMandatory: z.boolean().optional(),
});

export const CreateTeacherSubjectBody = z.object({
  subjectId: z.number().int(),
  classId: z.number().int().optional(),
});

export const PatchClassBody = z.object({
  name: z.string().optional(),
  classTeacherUserId: z.number().int().nullable().optional(),
  classTeacherId: z.number().int().nullable().optional(),
});

export const StudentDocumentTypeBody = z.enum([
  "student_photo",
  "birth_certificate",
  "aadhaar",
  "transfer_certificate",
  "other",
]);

export const CreateExamTypeBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  assessmentMode: z.enum(["marks", "grade", "both"]).optional(),
  isTermExam: z.boolean().optional(),
});

export const CreateExamBody = z.object({
  examTypeId: z.number().int(),
  classId: z.number().int(),
  name: z.string().min(1),
  examDate: z.string(),
  maxMarks: z.number().int().optional(),
});

export const UpsertExamResultBody = z.object({
  studentId: z.number().int(),
  marksObtained: z.number().int().optional(),
  grade: z.string().optional(),
  remarks: z.string().optional(),
});

export const CreateFeeHeadBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const CreateFeeStructureBody = z.object({
  classId: z.number().int(),
  feeHeadId: z.number().int(),
  amount: z.number().int(),
  dueDayOfMonth: z.number().int().min(1).max(31).optional(),
  effectiveFrom: z.string().optional(),
});

export const MarkStaffAttendanceBody = z.object({
  date: z.string(),
  records: z.array(
    z.object({
      userId: z.number().int(),
      status: z.enum(["present", "absent", "late", "excused"]),
      note: z.string().optional(),
    }),
  ),
});

export const CreateUdiseSnapshotBody = z.object({
  academicYear: z.string().min(1),
  notes: z.string().optional(),
});

export const StudentUdiseFields = z.object({
  guardianName: z.string().optional(),
  socialCategory: z.enum(["general", "sc", "st", "obc", "other"]).optional(),
  religion: z.string().optional(),
  aadhaar: z.string().optional(),
  admissionDate: z.string().optional(),
  transportAssigned: z.boolean().optional(),
  address: z.string().optional(),
});

/** Phase-1 mandatory parent contact fields (applied after OpenAPI body parse). */
export const StudentParentContactBody = z
  .object({
    parentPhone: z.string().optional(),
    parentMobile: z.string().optional(),
    parentEmail: z.string().email("Parent email is required"),
  })
  .refine((d) => Boolean((d.parentPhone ?? d.parentMobile)?.trim()), {
    message: "Parent mobile is required",
    path: ["parentPhone"],
  });

/** Branch user create with mandatory mobile + email and optional UDISE profile fields. */
export const CreateBranchUserWithProfileBody = z.object({
  name: z.string().min(1),
  mobile: z.string().min(10, "Staff mobile is required"),
  roleId: z.number().int().optional(),
  roleKey: z
    .enum(["teacher", "principal", "accountant", "school_admin", "coordinator"])
    .optional(),
  email: z.string().email("Staff email is required"),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  metadata: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      subject: z.string().optional(),
      salary: z.number().optional(),
      joinDate: z.string().optional(),
    })
    .optional(),
  employeeId: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  joiningDate: z.string().optional(),
  designation: z.string().optional(),
  staffType: z.enum(["teaching", "non_teaching"]).optional(),
  qualification: z.string().optional(),
  professionalQualification: z.string().optional(),
  subjectsTaught: z.array(z.string()).optional(),
  appointmentType: z.enum(["regular", "contract", "guest"]).optional(),
  salaryReference: z.string().optional(),
});
