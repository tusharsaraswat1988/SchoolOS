import { Router } from "express";
import { db, rolesTable, staffProfilesTable, usersTable } from "@workspace/db";
import { and, eq, like } from "drizzle-orm";
import { CreateBranchUserBody, UpdateBranchUserBody } from "@workspace/api-zod";
import { resolveBranchScope } from "../lib/scope";
import { mapBranchUserResponse } from "../lib/response-mappers";
import { CreateBranchUserWithProfileBody, StaffProfileBody } from "../lib/udise-schemas";
import { toPgDate } from "../lib/db-values";

const router = Router();

router.get("/branches/:branchId/users", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;

  const conditions = [eq(usersTable.branchId, branchId)];
  if (search) conditions.push(like(usersTable.name, `%${search}%`));

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mobile: usersTable.mobile,
      status: usersTable.status,
      societyId: usersTable.societyId,
      schoolId: usersTable.schoolId,
      branchId: usersTable.branchId,
      roleId: usersTable.roleId,
      roleKey: rolesTable.key,
      roleName: rolesTable.name,
      metadata: usersTable.metadata,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(and(...conditions));

  const data = (role ? rows.filter((r) => r.roleKey === role) : rows).map(mapBranchUserResponse);

  return res.json({ data, total: data.length });
});

router.post("/branches/:branchId/users", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const parsed = CreateBranchUserWithProfileBody.safeParse(req.body);
  if (!parsed.success) {
    const fallback = CreateBranchUserBody.safeParse(req.body);
    if (!fallback.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    if (!fallback.data.mobile?.trim()) {
      return res.status(400).json({ error: "Staff mobile is required" });
    }
    const email = (req.body as { email?: string }).email;
    if (!email?.trim()) {
      return res.status(400).json({ error: "Staff email is required" });
    }
    const [user] = await db
      .insert(usersTable)
      .values({
        name: fallback.data.name,
        mobile: fallback.data.mobile,
        roleId: fallback.data.roleId,
        status: fallback.data.status,
        metadata: fallback.data.metadata,
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
      })
      .returning();
    await db.insert(staffProfilesTable).values({ userId: user.id, email });
    return res.status(201).json(mapBranchUserResponse({ ...user, roleKey: null, roleName: null }));
  }

  const data = parsed.data;
  let roleId = data.roleId;
  if (!roleId && data.roleKey) {
    const [role] = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(eq(rolesTable.key, data.roleKey))
      .limit(1);
    if (!role) return res.status(400).json({ error: `Unknown role: ${data.roleKey}` });
    roleId = role.id;
  }
  if (!roleId) return res.status(400).json({ error: "roleId or roleKey is required" });

  const {
    email,
    employeeId,
    gender,
    dob,
    joiningDate,
    designation,
    staffType,
    qualification,
    professionalQualification,
    subjectsTaught,
    appointmentType,
    salaryReference,
    metadata,
    ...userFields
  } = data;

  const [user] = await db
    .insert(usersTable)
    .values({
      name: userFields.name,
      mobile: userFields.mobile,
      roleId,
      status: userFields.status,
      metadata,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
    })
    .returning();

  await db.insert(staffProfilesTable).values({
    userId: user.id,
    email,
    employeeId,
    gender,
    dob: dob ? toPgDate(dob) : undefined,
    joiningDate: joiningDate ? toPgDate(joiningDate) : undefined,
    designation,
    staffType,
    qualification,
    professionalQualification,
    subjectsTaught,
    appointmentType,
    salaryReference,
  });

  return res.status(201).json(mapBranchUserResponse({ ...user, roleKey: null, roleName: null }));
});

router.get("/branches/:branchId/users/:userId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mobile: usersTable.mobile,
      status: usersTable.status,
      societyId: usersTable.societyId,
      schoolId: usersTable.schoolId,
      branchId: usersTable.branchId,
      roleId: usersTable.roleId,
      roleKey: rolesTable.key,
      roleName: rolesTable.name,
      metadata: usersTable.metadata,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(mapBranchUserResponse(user));
});

router.patch("/branches/:branchId/users/:userId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);
  const parsed = UpdateBranchUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .returning();

  if (!user) return res.status(404).json({ error: "User not found" });
  const [withRole] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mobile: usersTable.mobile,
      status: usersTable.status,
      societyId: usersTable.societyId,
      schoolId: usersTable.schoolId,
      branchId: usersTable.branchId,
      roleId: usersTable.roleId,
      roleKey: rolesTable.key,
      roleName: rolesTable.name,
      metadata: usersTable.metadata,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  return res.json(mapBranchUserResponse(withRole!));
});

router.get("/branches/:branchId/users/:userId/profile", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [profile] = await db
    .select()
    .from(staffProfilesTable)
    .where(eq(staffProfilesTable.userId, userId))
    .limit(1);

  return res.json({ userId, profile: profile ?? null });
});

router.patch("/branches/:branchId/users/:userId/profile", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);
  const parsed = StaffProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const values = {
    ...parsed.data,
    email: parsed.data.email,
    dob: parsed.data.dob ? toPgDate(parsed.data.dob) : undefined,
    joiningDate: parsed.data.joiningDate ? toPgDate(parsed.data.joiningDate) : undefined,
  };

  const [existing] = await db
    .select()
    .from(staffProfilesTable)
    .where(eq(staffProfilesTable.userId, userId))
    .limit(1);

  const [profile] = existing
    ? await db
        .update(staffProfilesTable)
        .set(values)
        .where(eq(staffProfilesTable.userId, userId))
        .returning()
    : await db
        .insert(staffProfilesTable)
        .values({ userId, ...values })
        .returning();

  return res.json(profile);
});

export default router;
