import { and, count, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { DEFAULT_DEV_PASSWORD, formatUserCode, hashPassword } from "./password";
import {
  academicSessionsTable,
  announcementsTable,
  attendanceRecordsTable,
  auditLogsTable,
  branchesTable,
  classesTable,
  feeRecordsTable,
  parentsTable,
  permissionsTable,
  platformsTable,
  rolePermissionsTable,
  rolesTable,
  schoolsTable,
  sectionsTable,
  societiesTable,
  studentsTable,
  userPermissionsTable,
  usersTable,
} from "./schema";

type RoleKey =
  | "super_admin"
  | "society_admin"
  | "school_admin"
  | "principal"
  | "coordinator"
  | "accountant"
  | "teacher"
  | "parent"
  | "student";

const CLASS_NAMES = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
] as const;

const SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "Computer",
] as const;

const FIRST_NAMES = [
  "Aarav",
  "Vihaan",
  "Anaya",
  "Diya",
  "Ishaan",
  "Aadhya",
  "Krishna",
  "Myra",
  "Rudra",
  "Saanvi",
  "Kabir",
  "Anvi",
  "Reyansh",
  "Navya",
  "Advik",
  "Pari",
  "Arjun",
  "Meera",
  "Atharv",
  "Kiara",
] as const;

const LAST_NAMES = [
  "Sharma",
  "Singh",
  "Yadav",
  "Gupta",
  "Mishra",
  "Pandey",
  "Tiwari",
  "Verma",
  "Jaiswal",
  "Tripathi",
] as const;

const STREETS = [
  "Lanka Road",
  "Bhelupur Main Road",
  "DLW Colony",
  "Sarnath Link Road",
  "Mahmoorganj Street",
  "Sigra Extension",
] as const;

function hashOtpForDev(otp: string): string {
  return `dev-hash-${otp}`;
}

function randomFrom<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length];
}

function dateStr(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toISOString().slice(0, 10);
}

async function ensurePlatformSocietySchoolBranches() {
  const [platform] = await db
    .insert(platformsTable)
    .values({
      code: "SCHOOLOS",
      name: "SchoolOS",
      status: "active",
    })
    .onConflictDoNothing({ target: platformsTable.code })
    .returning();

  const platformRow =
    platform ??
    (await db.select().from(platformsTable).where(eq(platformsTable.code, "SCHOOLOS")).limit(1))[0];

  const [society] = await db
    .insert(societiesTable)
    .values({
      platformId: platformRow.id,
      code: "IAS",
      name: "Ishita Academy Society",
      status: "active",
    })
    .onConflictDoNothing({ target: [societiesTable.platformId, societiesTable.code] })
    .returning();

  const societyRow =
    society ??
    (await db
      .select()
      .from(societiesTable)
      .where(
        and(eq(societiesTable.platformId, platformRow.id), eq(societiesTable.code, "IAS")),
      )
      .limit(1))[0];

  const [school] = await db
    .insert(schoolsTable)
    .values({
      societyId: societyRow.id,
      code: "IS",
      name: "Ishita School",
      status: "active",
      createdBy: null,
      updatedBy: null,
    })
    .onConflictDoNothing({ target: [schoolsTable.societyId, schoolsTable.code] })
    .returning();

  const schoolRow =
    school ??
    (await db
      .select()
      .from(schoolsTable)
      .where(and(eq(schoolsTable.societyId, societyRow.id), eq(schoolsTable.code, "IS")))
      .limit(1))[0];

  await db
    .insert(branchesTable)
    .values([
      {
        societyId: societyRow.id,
        schoolId: schoolRow.id,
        code: "ISGC",
        name: "Gurudham Colony",
        timezone: "Asia/Kolkata",
        isMain: true,
        status: "active",
      },
      {
        societyId: societyRow.id,
        schoolId: schoolRow.id,
        code: "ISSG",
        name: "Seer Goverdhanpur",
        timezone: "Asia/Kolkata",
        isMain: false,
        status: "active",
      },
    ])
    .onConflictDoNothing({ target: [branchesTable.schoolId, branchesTable.code] });

  const branchRows = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.schoolId, schoolRow.id));

  return { platform: platformRow, society: societyRow, school: schoolRow, branches: branchRows };
}

async function ensureSession(ctx: {
  societyId: number;
  schoolId: number;
  branchId: number;
}) {
  const [session] = await db
    .insert(academicSessionsTable)
    .values({
      societyId: ctx.societyId,
      schoolId: ctx.schoolId,
      branchId: ctx.branchId,
      code: "2026-27",
      name: "Academic Session 2026-27",
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
      isCurrent: true,
      status: "active",
    })
    .onConflictDoNothing({ target: [academicSessionsTable.branchId, academicSessionsTable.code] })
    .returning();

  return (
    session ??
    (await db
      .select()
      .from(academicSessionsTable)
      .where(
        and(
          eq(academicSessionsTable.branchId, ctx.branchId),
          eq(academicSessionsTable.code, "2026-27"),
        ),
      )
      .limit(1))[0]
  );
}

async function ensureRolesPermissions(superAdminUserId: number | null) {
  const roles: Array<{ key: RoleKey; name: string; scope: "platform" | "society" | "school" | "branch" }> =
    [
      { key: "super_admin", name: "Super Admin", scope: "platform" },
      { key: "society_admin", name: "Society Admin", scope: "society" },
      { key: "school_admin", name: "School Admin", scope: "school" },
      { key: "principal", name: "Principal", scope: "branch" },
      { key: "coordinator", name: "Coordinator", scope: "branch" },
      { key: "accountant", name: "Accountant", scope: "branch" },
      { key: "teacher", name: "Teacher", scope: "branch" },
      { key: "parent", name: "Parent", scope: "branch" },
      { key: "student", name: "Student", scope: "branch" },
    ];

  await db
    .insert(rolesTable)
    .values(
      roles.map((role) => ({
        key: role.key,
        name: role.name,
        scope: role.scope,
        isSystem: true,
        status: "active",
        createdBy: superAdminUserId,
        updatedBy: superAdminUserId,
      })),
    )
    .onConflictDoNothing({ target: rolesTable.key });

  const permissions = [
    { key: "platform.full_access", module: "platform", action: "full_access", description: "Platform wide unrestricted access" },
    { key: "society.manage", module: "society", action: "manage", description: "Manage society level settings" },
    { key: "school.manage", module: "school", action: "manage", description: "Manage school level settings" },
    { key: "branch.manage", module: "branch", action: "manage", description: "Manage branch level settings" },
    { key: "session.manage", module: "session", action: "manage", description: "Manage academic sessions" },
    { key: "class.manage", module: "class", action: "manage", description: "Manage classes and sections" },
    { key: "student.manage", module: "student", action: "manage", description: "Create and update students" },
    { key: "student.read", module: "student", action: "read", description: "Read student data" },
    { key: "attendance.manage", module: "attendance", action: "manage", description: "Manage attendance actions" },
    { key: "fees.manage", module: "fees", action: "manage", description: "Manage fee records" },
    { key: "announcements.manage", module: "announcements", action: "manage", description: "Manage announcements" },
    { key: "audit.read", module: "audit", action: "read", description: "Read audit logs" },
    { key: "permissions.manage", module: "permissions", action: "manage", description: "Manage RBAC assignments" },
    { key: "profile.self_read", module: "profile", action: "self_read", description: "Read own profile only" },
    { key: "parent.child_read", module: "parent", action: "child_read", description: "Read linked child profile" },
  ];

  await db
    .insert(permissionsTable)
    .values(
      permissions.map((permission) => ({
        ...permission,
        status: "active",
        createdBy: superAdminUserId,
        updatedBy: superAdminUserId,
      })),
    )
    .onConflictDoNothing({ target: permissionsTable.key });

  const roleRows = await db.select().from(rolesTable);
  const permissionRows = await db.select().from(permissionsTable);
  const roleByKey = new Map(roleRows.map((role) => [role.key, role.id]));
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]));

  const matrix: Record<RoleKey, string[]> = {
    super_admin: permissionRows.map((p) => p.key),
    society_admin: [
      "society.manage",
      "school.manage",
      "branch.manage",
      "session.manage",
      "class.manage",
      "student.manage",
      "student.read",
      "attendance.manage",
      "fees.manage",
      "announcements.manage",
      "audit.read",
      "permissions.manage",
    ],
    school_admin: [
      "school.manage",
      "branch.manage",
      "session.manage",
      "class.manage",
      "student.manage",
      "student.read",
      "attendance.manage",
      "fees.manage",
      "announcements.manage",
      "audit.read",
      "permissions.manage",
    ],
    principal: [
      "branch.manage",
      "session.manage",
      "class.manage",
      "student.manage",
      "student.read",
      "attendance.manage",
      "announcements.manage",
      "audit.read",
    ],
    coordinator: ["class.manage", "student.read", "attendance.manage", "announcements.manage"],
    accountant: ["student.read", "fees.manage", "audit.read"],
    teacher: ["student.read", "attendance.manage", "announcements.manage"],
    parent: ["profile.self_read", "parent.child_read"],
    student: ["profile.self_read"],
  };

  const rows = Object.entries(matrix).flatMap(([roleKey, permissionKeys]) => {
    const roleId = roleByKey.get(roleKey);
    if (!roleId) return [];
    return permissionKeys
      .map((permissionKey) => {
        const permissionId = permissionByKey.get(permissionKey);
        if (!permissionId) return null;
        return {
          roleId,
          permissionId,
          isAllowed: true,
          constraints: null,
          createdBy: superAdminUserId,
          updatedBy: superAdminUserId,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });

  if (rows.length > 0) {
    await db
      .insert(rolePermissionsTable)
      .values(rows)
      .onConflictDoNothing({ target: [rolePermissionsTable.roleId, rolePermissionsTable.permissionId] });
  }
}

async function ensureUser(input: {
  name: string;
  mobile: string;
  userCode: string;
  roleKey: RoleKey;
  societyId: number | null;
  schoolId: number | null;
  branchId: number | null;
  studentId?: number | null;
  email?: string;
  passwordPlain?: string;
  otpBypassCode?: string;
  createdBy: number | null;
}) {
  const role = (
    await db.select().from(rolesTable).where(eq(rolesTable.key, input.roleKey)).limit(1)
  )[0];
  if (!role) throw new Error(`Role missing: ${input.roleKey}`);

  const passwordHash = await hashPassword(input.passwordPlain ?? DEFAULT_DEV_PASSWORD);
  const email = input.email ?? `${input.userCode.toLowerCase()}@schoolos.dev`;

  const [created] = await db
    .insert(usersTable)
    .values({
      societyId: input.societyId,
      schoolId: input.schoolId,
      branchId: input.branchId,
      studentId: input.studentId ?? null,
      roleId: role.id,
      userCode: input.userCode.toUpperCase(),
      passwordHash,
      name: input.name,
      mobile: input.mobile,
      email,
      status: "active",
      otpBypassCode: input.otpBypassCode ?? null,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    })
    .onConflictDoUpdate({
      target: usersTable.mobile,
      set: {
        userCode: input.userCode.toUpperCase(),
        passwordHash,
        email,
        name: input.name,
        societyId: input.societyId,
        schoolId: input.schoolId,
        branchId: input.branchId,
        studentId: input.studentId ?? null,
        roleId: role.id,
        updatedBy: input.createdBy,
      },
    })
    .returning();

  return (
    created ??
    (await db.select().from(usersTable).where(eq(usersTable.mobile, input.mobile)).limit(1))[0]
  );
}

async function backfillMissingCredentials() {
  const rows = await db.select().from(usersTable).where(sql`${usersTable.userCode} IS NULL`);
  let n = 1;
  for (const row of rows) {
    const code = formatUserCode("LEGACY", n++);
    const passwordHash = await hashPassword(DEFAULT_DEV_PASSWORD);
    await db
      .update(usersTable)
      .set({
        userCode: code,
        passwordHash,
        email: `${code.toLowerCase()}@schoolos.dev`,
      })
      .where(eq(usersTable.id, row.id));
  }
}

async function seedOrgUsers(ctx: {
  societyId: number;
  schoolId: number;
  isgcBranchId: number;
  issgBranchId: number;
}) {
  await ensureRolesPermissions(null);

  const superAdmin = await ensureUser({
    name: "Tushar Saraswat",
    mobile: "8707488250",
    userCode: "SUPER0001",
    roleKey: "super_admin",
    societyId: null,
    schoolId: null,
    branchId: null,
    otpBypassCode: "000000",
    createdBy: null,
  });

  const societyAdmin = await ensureUser({
    name: "Rajesh Saraswat",
    mobile: "9151119959",
    userCode: "SOC0001",
    roleKey: "society_admin",
    societyId: ctx.societyId,
    schoolId: null,
    branchId: null,
    otpBypassCode: "111111",
    createdBy: superAdmin.id,
  });

  const schoolAdminG = await ensureUser({
    name: "Indu Saraswat",
    mobile: "9889960999",
    userCode: "SCHADMIN0001",
    roleKey: "school_admin",
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.isgcBranchId,
    otpBypassCode: "222222",
    createdBy: superAdmin.id,
  });

  const schoolAdminS = await ensureUser({
    name: "Shiwangi Saraswat",
    mobile: "7800899008",
    userCode: "SCHADMIN0002",
    roleKey: "school_admin",
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.issgBranchId,
    otpBypassCode: "333333",
    createdBy: superAdmin.id,
  });

  const principalG = await ensureUser({
    name: "Seema Bajaj",
    mobile: "8701000001",
    userCode: "PRN0001",
    roleKey: "principal",
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.isgcBranchId,
    createdBy: superAdmin.id,
  });

  const principalS = await ensureUser({
    name: "Geeta Yadav",
    mobile: "8701000002",
    userCode: "PRN0002",
    roleKey: "principal",
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.issgBranchId,
    createdBy: superAdmin.id,
  });

  const coordinatorNames = [
    ["Amit Dubey", "8701000011", ctx.isgcBranchId, "COORD0001"],
    ["Pooja Mishra", "8701000012", ctx.isgcBranchId, "COORD0002"],
    ["Nitin Singh", "8701000013", ctx.issgBranchId, "COORD0003"],
    ["Ritika Gupta", "8701000014", ctx.issgBranchId, "COORD0004"],
  ] as const;

  for (const [name, mobile, branchId, userCode] of coordinatorNames) {
    await ensureUser({
      name,
      mobile,
      userCode,
      roleKey: "coordinator",
      societyId: ctx.societyId,
      schoolId: ctx.schoolId,
      branchId,
      createdBy: superAdmin.id,
    });
  }

  const accountantNames = [
    ["Deepak Shah", "8701000021", ctx.isgcBranchId, "ACCT0001"],
    ["Anjali Jain", "8701000022", ctx.isgcBranchId, "ACCT0002"],
    ["Vivek Agrawal", "8701000023", ctx.issgBranchId, "ACCT0003"],
    ["Neha Kesarwani", "8701000024", ctx.issgBranchId, "ACCT0004"],
  ] as const;

  for (const [name, mobile, branchId, userCode] of accountantNames) {
    await ensureUser({
      name,
      mobile,
      userCode,
      roleKey: "accountant",
      societyId: ctx.societyId,
      schoolId: ctx.schoolId,
      branchId,
      createdBy: superAdmin.id,
    });
  }

  let teacherCounter = 1;
  for (const [branchCode, branchId] of [
    ["ISGC", ctx.isgcBranchId],
    ["ISSG", ctx.issgBranchId],
  ] as const) {
    for (let i = 0; i < 10; i++) {
      const subject = SUBJECTS[i % SUBJECTS.length];
      const label = i < 5 ? "Class Teacher" : "Subject Teacher";
      await ensureUser({
        name: `${randomFrom(FIRST_NAMES, i)} ${randomFrom(LAST_NAMES, i)} (${label} - ${subject})`,
        mobile: `871${branchCode === "ISGC" ? "1" : "2"}${String(i + 1).padStart(6, "0")}`,
        userCode: formatUserCode("TCHR", teacherCounter++),
        roleKey: "teacher",
        societyId: ctx.societyId,
        schoolId: ctx.schoolId,
        branchId,
        createdBy: superAdmin.id,
      });
    }
  }

  return {
    superAdmin,
    societyAdmin,
    schoolAdminG,
    schoolAdminS,
    principalG,
    principalS,
  };
}

async function seedClassesSectionsAndStudents(ctx: {
  societyId: number;
  schoolId: number;
  branchCode: "ISGC" | "ISSG";
  branchId: number;
  sessionId: number;
  actorUserId: number;
  parentCounterStart: number;
}) {
  const createdStudents: number[] = [];
  let admissionCounter = 1;
  let parentCounter = ctx.parentCounterStart;

  for (let c = 0; c < CLASS_NAMES.length; c++) {
    const classCode = `C${String(c + 1).padStart(2, "0")}`;
    const className = CLASS_NAMES[c];

    const [classRow] = await db
      .insert(classesTable)
      .values({
        societyId: ctx.societyId,
        schoolId: ctx.schoolId,
        branchId: ctx.branchId,
        sessionId: ctx.sessionId,
        code: classCode,
        name: className,
        gradeOrder: c + 1,
        status: "active",
        createdBy: ctx.actorUserId,
        updatedBy: ctx.actorUserId,
      })
      .onConflictDoNothing({ target: [classesTable.sessionId, classesTable.code] })
      .returning();

    const classEntity =
      classRow ??
      (await db
        .select()
        .from(classesTable)
        .where(
          and(eq(classesTable.sessionId, ctx.sessionId), eq(classesTable.code, classCode)),
        )
        .limit(1))[0];

    const [sectionRow] = await db
      .insert(sectionsTable)
      .values({
        societyId: ctx.societyId,
        schoolId: ctx.schoolId,
        branchId: ctx.branchId,
        classId: classEntity.id,
        code: "A",
        name: "Section A",
        capacity: 60,
        status: "active",
        createdBy: ctx.actorUserId,
        updatedBy: ctx.actorUserId,
      })
      .onConflictDoNothing({ target: [sectionsTable.classId, sectionsTable.code] })
      .returning();

    const sectionEntity =
      sectionRow ??
      (await db
        .select()
        .from(sectionsTable)
        .where(and(eq(sectionsTable.classId, classEntity.id), eq(sectionsTable.code, "A")))
        .limit(1))[0];

    for (let s = 0; s < 5; s++) {
      const admissionNo = `${ctx.branchCode}${String(admissionCounter).padStart(4, "0")}`;
      const firstName = randomFrom(FIRST_NAMES, admissionCounter + s + c);
      const lastName = randomFrom(LAST_NAMES, admissionCounter + c);
      const gender = s % 2 === 0 ? "male" : "female";
      const father = `${randomFrom(FIRST_NAMES, s + c)} ${lastName}`;
      const mother = `${randomFrom(FIRST_NAMES, s + c + 7)} ${lastName}`;
      const parentMobile = `89${ctx.branchCode === "ISGC" ? "1" : "2"}${String(admissionCounter).padStart(7, "0")}`;

      const [studentRow] = await db
        .insert(studentsTable)
        .values({
          societyId: ctx.societyId,
          schoolId: ctx.schoolId,
          branchId: ctx.branchId,
          sessionId: ctx.sessionId,
          classId: classEntity.id,
          sectionId: sectionEntity.id,
          admissionNumber: admissionNo,
          firstName,
          lastName,
          dob: dateStr(2014 + (c % 6), ((s + c) % 12) + 1, ((s * 4 + 5) % 27) + 1),
          gender,
          fatherName: father,
          motherName: mother,
          parentMobile,
          parentEmail: `${parentMobile}@parent.schoolos.dev`,
          address: `${(s + 10) * 3}, ${randomFrom(STREETS, c + s)}, Varanasi`,
          status: "active",
          createdBy: ctx.actorUserId,
          updatedBy: ctx.actorUserId,
        })
        .onConflictDoNothing({ target: studentsTable.admissionNumber })
        .returning();

      const studentEntity =
        studentRow ??
        (await db
          .select()
          .from(studentsTable)
          .where(eq(studentsTable.admissionNumber, admissionNo))
          .limit(1))[0];

      createdStudents.push(studentEntity.id);

      const parentUser = await ensureUser({
        name: `${father} (Parent of ${firstName})`,
        mobile: parentMobile,
        userCode: formatUserCode("PAR", parentCounter++),
        roleKey: "parent",
        societyId: ctx.societyId,
        schoolId: ctx.schoolId,
        branchId: ctx.branchId,
        createdBy: ctx.actorUserId,
      });

      await db
        .insert(parentsTable)
        .values({
          societyId: ctx.societyId,
          schoolId: ctx.schoolId,
          branchId: ctx.branchId,
          studentId: studentEntity.id,
          userId: parentUser.id,
          relationship: "father",
          isPrimary: true,
          createdBy: ctx.actorUserId,
          updatedBy: ctx.actorUserId,
        })
        .onConflictDoNothing({ target: [parentsTable.studentId, parentsTable.userId] });

      admissionCounter++;
    }
  }

  return { studentIds: createdStudents, nextParentCounter: parentCounter };
}

async function seedSampleOpsData(ctx: {
  societyId: number;
  schoolId: number;
  branchId: number;
  sessionId: number;
  actorUserId: number;
  studentIds: number[];
}) {
  const classes = await db
    .select({ id: classesTable.id })
    .from(classesTable)
    .where(and(eq(classesTable.branchId, ctx.branchId), eq(classesTable.sessionId, ctx.sessionId)));

  const sections = await db
    .select({ id: sectionsTable.id })
    .from(sectionsTable)
    .where(eq(sectionsTable.branchId, ctx.branchId));

  const attendanceRows = Array.from({ length: 15 }).map((_, idx) => ({
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.branchId,
    sessionId: ctx.sessionId,
    classId: classes[idx % classes.length].id,
    sectionId: sections[idx % sections.length].id,
    studentId: ctx.studentIds[idx % ctx.studentIds.length],
    attendanceDate: dateStr(2026, 7, (idx % 28) + 1),
    status: (idx % 5 === 0 ? "absent" : idx % 3 === 0 ? "late" : "present") as
      | "present"
      | "absent"
      | "late"
      | "excused",
    note: idx % 4 === 0 ? "Auto generated sample" : null,
    createdBy: ctx.actorUserId,
    updatedBy: ctx.actorUserId,
  }));

  await db
    .insert(attendanceRecordsTable)
    .values(attendanceRows)
    .onConflictDoNothing({ target: [attendanceRecordsTable.studentId, attendanceRecordsTable.attendanceDate] });

  const [existingFees] = await db
    .select({ c: count() })
    .from(feeRecordsTable)
    .where(eq(feeRecordsTable.branchId, ctx.branchId));

  if (Number(existingFees.c) === 0) {
    const feeRows = Array.from({ length: 15 }).map((_, idx) => {
    const amount = 2000 + (idx % 6) * 250;
    const paid = idx % 3 === 0 ? amount : idx % 2 === 0 ? Math.floor(amount / 2) : 0;
    return {
      societyId: ctx.societyId,
      schoolId: ctx.schoolId,
      branchId: ctx.branchId,
      sessionId: ctx.sessionId,
      studentId: ctx.studentIds[idx % ctx.studentIds.length],
      feeType: idx % 2 === 0 ? "Tuition" : "Transport",
      amount,
      paidAmount: paid,
      status: (paid === 0 ? "pending" : paid >= amount ? "paid" : "partial") as
        | "pending"
        | "partial"
        | "paid"
        | "overdue",
      dueDate: dateStr(2026, 8, (idx % 25) + 1),
      paidDate: paid > 0 ? dateStr(2026, 8, (idx % 25) + 2) : null,
      receiptNumber: paid > 0 ? `RCP-${ctx.branchId}-${idx + 1}` : null,
      createdBy: ctx.actorUserId,
      updatedBy: ctx.actorUserId,
    };
  });

    await db.insert(feeRecordsTable).values(feeRows);
  }

  const [existingAnnouncements] = await db
    .select({ c: count() })
    .from(announcementsTable)
    .where(eq(announcementsTable.branchId, ctx.branchId));

  if (Number(existingAnnouncements.c) === 0) {
    const announcementRows = Array.from({ length: 10 }).map((_, idx) => ({
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.branchId,
    title: `Announcement ${idx + 1} - Branch ${ctx.branchId}`,
    body:
      idx % 2 === 0
        ? "Monthly timetable and co-curricular schedule updated."
        : "Please ensure fee payment and document verification are completed.",
    audience: (idx % 4 === 0
      ? "teachers"
      : idx % 3 === 0
      ? "parents"
      : "all") as "all" | "teachers" | "students" | "parents",
    priority: (idx % 5 === 0 ? "high" : "normal") as "low" | "normal" | "high" | "urgent",
    createdBy: ctx.actorUserId,
    updatedBy: ctx.actorUserId,
  }));

    await db.insert(announcementsTable).values(announcementRows);
  }

  const [existingAudit] = await db
    .select({ c: count() })
    .from(auditLogsTable)
    .where(eq(auditLogsTable.branchId, ctx.branchId));

  if (Number(existingAudit.c) === 0) {
    const auditRows = Array.from({ length: 10 }).map((_, idx) => ({
    societyId: ctx.societyId,
    schoolId: ctx.schoolId,
    branchId: ctx.branchId,
    actorUserId: ctx.actorUserId,
    action: (idx % 5 === 0
      ? "permission_changed"
      : idx % 4 === 0
      ? "student_transfer"
      : idx % 3 === 0
      ? "fee_action"
      : idx % 2 === 0
      ? "attendance_action"
      : "student_updated") as
      | "permission_changed"
      | "student_transfer"
      | "fee_action"
      | "attendance_action"
      | "student_updated",
    entityType: idx % 2 === 0 ? "student" : "settings",
    entityId: String(ctx.studentIds[idx % ctx.studentIds.length]),
    entityLabel: "Sample entity log",
    oldValue: { value: "old", index: idx },
    newValue: { value: "new", index: idx },
    metadata: { source: "phase0-seed" },
    ipAddress: `10.0.0.${idx + 1}`,
    userAgent: "seed-script/phase0",
  }));

    await db.insert(auditLogsTable).values(auditRows);
  }
}

async function syncUserPermissionOverridesForSpecialCases(superAdminId: number) {
  const parentRole = (await db.select().from(rolesTable).where(eq(rolesTable.key, "parent")).limit(1))[0];
  const parentUsers = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.roleId, parentRole.id));

  const parentChildRead = (
    await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.key, "parent.child_read"))
      .limit(1)
  )[0];

  if (parentChildRead && parentUsers.length > 0) {
    await db
      .insert(userPermissionsTable)
      .values(
        parentUsers.map((u) => ({
          userId: u.id,
          permissionId: parentChildRead.id,
          isAllowed: true,
          constraints: { scope: "linked_children_only" },
          createdBy: superAdminId,
          updatedBy: superAdminId,
        })),
      )
      .onConflictDoNothing({ target: [userPermissionsTable.userId, userPermissionsTable.permissionId] });
  }
}

export async function seedPhase0Foundation() {
  const org = await ensurePlatformSocietySchoolBranches();
  const isgc = org.branches.find((b) => b.code === "ISGC");
  const issg = org.branches.find((b) => b.code === "ISSG");
  if (!isgc || !issg) throw new Error("Required branches ISGC/ISSG missing");

  const users = await seedOrgUsers({
    societyId: org.society.id,
    schoolId: org.school.id,
    isgcBranchId: isgc.id,
    issgBranchId: issg.id,
  });

  const sessionIsgc = await ensureSession({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchId: isgc.id,
  });
  const sessionIssg = await ensureSession({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchId: issg.id,
  });

  const isgcStudents = await seedClassesSectionsAndStudents({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchCode: "ISGC",
    branchId: isgc.id,
    sessionId: sessionIsgc.id,
    actorUserId: users.superAdmin.id,
    parentCounterStart: 1,
  });

  const issgStudents = await seedClassesSectionsAndStudents({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchCode: "ISSG",
    branchId: issg.id,
    sessionId: sessionIssg.id,
    actorUserId: users.superAdmin.id,
    parentCounterStart: isgcStudents.nextParentCounter,
  });

  await backfillMissingCredentials();

  await seedSampleOpsData({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchId: isgc.id,
    sessionId: sessionIsgc.id,
    actorUserId: users.superAdmin.id,
    studentIds: isgcStudents.studentIds,
  });
  await seedSampleOpsData({
    societyId: org.society.id,
    schoolId: org.school.id,
    branchId: issg.id,
    sessionId: sessionIssg.id,
    actorUserId: users.superAdmin.id,
    studentIds: issgStudents.studentIds,
  });

  await syncUserPermissionOverridesForSpecialCases(users.superAdmin.id);

  const [roleCount] = await db.select({ c: count() }).from(rolesTable);
  const [permissionCount] = await db.select({ c: count() }).from(permissionsTable);
  const [userCount] = await db.select({ c: count() }).from(usersTable);
  const [studentCount] = await db.select({ c: count() }).from(studentsTable);
  const [parentCount] = await db.select({ c: count() }).from(parentsTable);
  const [attendanceCount] = await db.select({ c: count() }).from(attendanceRecordsTable);
  const [feeCount] = await db.select({ c: count() }).from(feeRecordsTable);
  const [announcementCount] = await db.select({ c: count() }).from(announcementsTable);
  const [auditCount] = await db.select({ c: count() }).from(auditLogsTable);

  const [classCount] = await db.select({ c: count() }).from(classesTable);
  const [sectionCount] = await db.select({ c: count() }).from(sectionsTable);
  const [sessionCount] = await db.select({ c: count() }).from(academicSessionsTable);
  const [branchCount] = await db.select({ c: count() }).from(branchesTable);

  const summary = {
    hierarchy: {
      platform: org.platform.name,
      society: `${org.society.code} — ${org.society.name}`,
      school: `${org.school.code} — ${org.school.name}`,
      branches: org.branches.map((b) => ({ id: b.id, code: b.code, name: b.name, isMain: b.isMain })),
      sessions: [
        { branchCode: "ISGC", id: sessionIsgc.id, code: sessionIsgc.code },
        { branchCode: "ISSG", id: sessionIssg.id, code: sessionIssg.code },
      ],
    },
    counts: {
      roles: roleCount.c,
      permissions: permissionCount.c,
      users: userCount.c,
      classes: classCount.c,
      sections: sectionCount.c,
      students: studentCount.c,
      parents: parentCount.c,
      attendanceRecords: attendanceCount.c,
      feeRecords: feeCount.c,
      announcements: announcementCount.c,
      auditLogs: auditCount.c,
      sessions: sessionCount.c,
      branches: branchCount.c,
    },
    testCredentials: {
      devOtp: "123456",
      logins: [
        { role: "super_admin", name: users.superAdmin.name, mobile: users.superAdmin.mobile },
        { role: "society_admin", name: users.societyAdmin.name, mobile: users.societyAdmin.mobile },
        { role: "principal", name: users.principalG.name, mobile: users.principalG.mobile, branch: "ISGC" },
        { role: "principal", name: users.principalS.name, mobile: users.principalS.mobile, branch: "ISSG" },
      ],
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
