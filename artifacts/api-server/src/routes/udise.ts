import { Router } from "express";
import {
  classesTable,
  db,
  schoolProfilesTable,
  staffProfilesTable,
  studentsTable,
  udiseSnapshotsTable,
  usersTable,
  rolesTable,
} from "@workspace/db";
import { and, count, eq, sql } from "drizzle-orm";
import { CreateUdiseSnapshotBody } from "../lib/udise-schemas";

const router = Router();

const PROFILE_FIELDS = [
  "udiseCode",
  "schoolCategory",
  "schoolType",
  "managementType",
  "managementCode",
  "address",
  "district",
  "block",
  "village",
  "pincode",
  "latitude",
  "longitude",
  "mobile",
  "email",
  "website",
  "principalName",
  "principalMobile",
  "principalEmail",
  "yearOfEstablishment",
  "recognitionStatus",
  "affiliationBoard",
  "affiliationBoardName",
  "affiliationNumber",
  "mediumOfInstruction",
  "lowestClass",
  "highestClass",
  "prePrimaryAvailable",
  "minoritySchoolFlag",
  "residentialSchoolFlag",
  "streamsAvailable",
] as const;

function computeProfileCompliance(profile: Record<string, unknown> | null | undefined): number {
  if (!profile) return 0;
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = profile[f];
    if (v == null || v === "") return false;
    if (typeof v === "object" && !Array.isArray(v)) {
      return Object.values(v as Record<string, unknown>).some((x) => x === true);
    }
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

router.get("/schools/:schoolId/udise-snapshots", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const rows = await db
    .select()
    .from(udiseSnapshotsTable)
    .where(eq(udiseSnapshotsTable.schoolId, schoolId))
    .orderBy(sql`${udiseSnapshotsTable.academicYear} desc`);

  return res.json({ data: rows, total: rows.length });
});

router.post("/schools/:schoolId/udise-snapshots", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateUdiseSnapshotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [profile] = await db
    .select()
    .from(schoolProfilesTable)
    .where(eq(schoolProfilesTable.schoolId, schoolId))
    .limit(1);

  const [studentStats] = await db
    .select({
      total: count(),
      withCategory: sql<number>`sum(case when ${studentsTable.socialCategory} is not null then 1 else 0 end)`,
    })
    .from(studentsTable)
    .where(eq(studentsTable.schoolId, schoolId));

  const [staffStats] = await db
    .select({ total: count() })
    .from(usersTable)
    .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        sql`${rolesTable.key} in ('teacher', 'principal', 'coordinator', 'accountant')`,
      ),
    );

  const [staffWithProfile] = await db
    .select({ total: count() })
    .from(staffProfilesTable)
    .innerJoin(usersTable, eq(staffProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.schoolId, schoolId));

  const [classCount] = await db
    .select({ total: count() })
    .from(classesTable)
    .where(eq(classesTable.schoolId, schoolId));

  const profileSnapshot = profile ?? null;
  const enrollmentSnapshot = {
    totalStudents: Number(studentStats.total),
    studentsWithSocialCategory: Number(studentStats.withCategory ?? 0),
    totalClasses: Number(classCount.total),
  };
  const staffSnapshot = {
    totalStaff: Number(staffStats.total),
    staffWithProfile: Number(staffWithProfile.total),
  };
  const infrastructureSnapshot = { note: "Phase-2 infrastructure block pending" };

  const profileCompliance = computeProfileCompliance(profileSnapshot as Record<string, unknown>);
  const enrollmentCompliance =
    Number(studentStats.total) === 0
      ? 0
      : Math.round((Number(studentStats.withCategory ?? 0) / Number(studentStats.total)) * 100);
  const staffCompliance =
    Number(staffStats.total) === 0
      ? 0
      : Math.round((Number(staffWithProfile.total) / Number(staffStats.total)) * 100);
  const compliancePercentage = Math.round(
    (profileCompliance + enrollmentCompliance + staffCompliance) / 3,
  );

  const [snapshot] = await db
    .insert(udiseSnapshotsTable)
    .values({
      schoolId,
      academicYear: parsed.data.academicYear,
      profileSnapshot,
      enrollmentSnapshot,
      staffSnapshot,
      infrastructureSnapshot,
      compliancePercentage: String(compliancePercentage),
      exportReadyStatus: compliancePercentage >= 80 ? "ready" : "draft",
      notes: parsed.data.notes,
    })
    .onConflictDoUpdate({
      target: [udiseSnapshotsTable.schoolId, udiseSnapshotsTable.academicYear],
      set: {
        profileSnapshot,
        enrollmentSnapshot,
        staffSnapshot,
        infrastructureSnapshot,
        compliancePercentage: String(compliancePercentage),
        exportReadyStatus: compliancePercentage >= 80 ? "ready" : "draft",
        notes: parsed.data.notes,
        updatedAt: new Date(),
      },
    })
    .returning();

  return res.status(201).json(snapshot);
});

router.get("/schools/:schoolId/udise-snapshots/:snapshotId/export", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const snapshotId = Number(req.params.snapshotId);

  const [snapshot] = await db
    .select()
    .from(udiseSnapshotsTable)
    .where(
      and(eq(udiseSnapshotsTable.schoolId, schoolId), eq(udiseSnapshotsTable.id, snapshotId)),
    )
    .limit(1);

  if (!snapshot) return res.status(404).json({ error: "Snapshot not found" });

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="udise-snapshot-${snapshot.academicYear}.json"`,
  );
  return res.send(
    JSON.stringify(
      {
        academicYear: snapshot.academicYear,
        exportReadyStatus: snapshot.exportReadyStatus,
        compliancePercentage: snapshot.compliancePercentage,
        profile: snapshot.profileSnapshot,
        enrollment: snapshot.enrollmentSnapshot,
        staff: snapshot.staffSnapshot,
        infrastructure: snapshot.infrastructureSnapshot,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
});

export default router;
