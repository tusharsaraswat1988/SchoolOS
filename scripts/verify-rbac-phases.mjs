/**
 * RBAC phase verification script.
 * Usage: node scripts/verify-rbac-phases.mjs [phase-a|phase-b|phase-c|all]
 *
 * Requires API server on PORT (default 5000) and seeded database.
 */
import "dotenv/config";

const API = process.env.API_BASE ?? "http://127.0.0.1:5000/api";
const phase = process.argv[2] ?? "all";
const PASSWORD = process.env.SEED_DEV_PASSWORD ?? "SchoolOS@123";

async function login(userId, schoolCode = "IS") {
  const captchaRes = await fetch(`${API}/auth/captcha`);
  const captcha = await captchaRes.json();
  const match = String(captcha.question).match(/(\d+)\s*\+\s*(\d+)/);
  const captchaAnswer = match ? String(Number(match[1]) + Number(match[2])) : "0";
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolCode: schoolCode || undefined,
      userId,
      accessCode: PASSWORD,
      captchaAnswer,
      captchaToken: captcha.token,
    }),
  });
  if (!res.ok) throw new Error(`Login failed for ${userId}: ${await res.text()}`);
  return res.json();
}

async function authedGet(token, path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: res.ok ? await res.json() : await res.text() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyPhaseA() {
  console.log("\n=== Phase A: Permission wiring ===");
  const superLogin = await login("SUPER0001", "");
  assert(superLogin.permissions?.includes("platform.full_access"), "Super admin should have platform.full_access");

  const navRes = await authedGet(superLogin.token, "/auth/navigation");
  assert(navRes.status === 200, "GET /auth/navigation should succeed");
  assert(navRes.body.items?.some((i) => i.key === "platform"), "Super admin nav should include platform");

  const teacherLogin = await login("TCHR0001");
  assert(
    teacherLogin.permissions?.includes("student.read"),
    "Teacher should have student.read from role_permissions",
  );
  assert(
    !teacherLogin.permissions?.includes("fees.manage"),
    "Teacher should not have fees.manage by default",
  );

  const branchId = teacherLogin.user.branchId;
  const sessionId = teacherLogin.user.sessionId;
  if (branchId && sessionId) {
    const teacherStudents = await authedGet(
      teacherLogin.token,
      `/branches/${branchId}/sessions/${sessionId}/students`,
    );
    assert(teacherStudents.status !== 403, "Teacher student list should not be forbidden in scope");
  }

  console.log("Phase A: PASS");
}

async function verifyPhaseB() {
  console.log("\n=== Phase B: School access control APIs ===");
  const adminLogin = await login("SCHADMIN0001");
  const schoolId = adminLogin.user.schoolId ?? 1;
  const branchId = adminLogin.user.branchId ?? 1;

  const overview = await authedGet(adminLogin.token, `/schools/${schoolId}/access-control/overview`);
  assert(overview.status === 200, "School overview should be accessible with permissions.manage");
  assert(Array.isArray(overview.body.roleMatrix), "Overview should include roleMatrix");

  const users = await authedGet(adminLogin.token, `/branches/${branchId}/access-control/users?role=teacher`);
  assert(users.status === 200, "Branch user directory should load");
  assert(Array.isArray(users.body.data), "Users payload should include data array");

  console.log("Phase B: PASS");
}

async function verifyPhaseC() {
  console.log("\n=== Phase C: Platform access control ===");
  const superLogin = await login("SUPER0001", "");
  const overview = await authedGet(superLogin.token, "/platform/access-control/overview");
  assert(overview.status === 200, "Platform overview should load for super admin");
  assert(Array.isArray(overview.body.roles), "Platform overview should list roles");
  assert(Array.isArray(overview.body.permissions), "Platform overview should list permissions");

  const teacherLogin = await login("TCHR0001");
  const denied = await authedGet(teacherLogin.token, "/platform/access-control/overview");
  assert(denied.status === 403, "Teacher must not access platform RBAC");

  console.log("Phase C: PASS");
}

async function main() {
  const normalized = phase.replace(/^phase-/, "");
  const phases = normalized === "all" ? ["a", "b", "c"] : [normalized];
  for (const p of phases) {
    if (p === "a") await verifyPhaseA();
    else if (p === "b") await verifyPhaseB();
    else if (p === "c") await verifyPhaseC();
    else throw new Error(`Unknown phase: ${p}`);
  }
  console.log("\nAll requested RBAC verification checks passed.");
}

main().catch((err) => {
  console.error("\nRBAC verification FAILED:", err.message);
  process.exit(1);
});
