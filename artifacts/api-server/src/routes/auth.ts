import { Router } from "express";

import { db, rolesTable, usersTable } from "@workspace/db";

import { eq, sql } from "drizzle-orm";

import { z } from "zod";

import { loadAuthSession } from "../lib/auth-helpers";
import { createMathCaptcha, verifyCaptchaToken } from "../lib/captcha";

import { verifyPassword } from "../lib/password";

import {

  resolveAuthScope,

  resolveSchoolByCode,

  userMatchesSchool,

} from "../lib/auth-scope";

import { resolveLoginRedirect } from "../lib/auth-redirect";



const router = Router();



const LoginBody = z.object({

  schoolCode: z.string().optional().nullable(),

  userId: z.string().min(1),

  accessCode: z.string().min(1),

  captchaAnswer: z.string().min(1),

  captchaToken: z.string().min(1),

});



router.get("/auth/captcha", (_req, res) => {

  const captcha = createMathCaptcha();

  return res.json(captcha);

});



router.post("/auth/login", async (req, res) => {

  const parsed = LoginBody.safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });



  const { schoolCode, userId, accessCode, captchaAnswer, captchaToken } = parsed.data;



  if (!verifyCaptchaToken(captchaToken, captchaAnswer)) {

    return res.status(401).json({ error: "Invalid captcha" });

  }



  const userCode = userId.trim().toUpperCase();

  const [user] = await db

    .select()

    .from(usersTable)

    .where(sql`upper(${usersTable.userCode}) = ${userCode}`)

    .limit(1);



  if (!user || user.status !== "active") {

    return res.status(401).json({ error: "Invalid credentials" });

  }



  const passwordOk = await verifyPassword(accessCode, user.passwordHash);

  if (!passwordOk) {

    return res.status(401).json({ error: "Invalid credentials" });

  }



  const [role] = await db

    .select()

    .from(rolesTable)

    .where(eq(rolesTable.id, user.roleId))

    .limit(1);

  const roleKey = role?.key ?? "teacher";



  if (schoolCode?.trim()) {

    const school = await resolveSchoolByCode(schoolCode);

    if (!school) return res.status(401).json({ error: "Invalid school code" });

    if (!userMatchesSchool(user, roleKey, school.id)) {

      return res.status(401).json({ error: "Invalid credentials" });

    }

    if (roleKey !== "super_admin" && roleKey !== "society_admin" && user.schoolId && user.schoolId !== school.id) {

      return res.status(401).json({ error: "Invalid credentials" });

    }

  } else if (!["super_admin", "society_admin"].includes(roleKey) && user.schoolId) {

    return res.status(401).json({ error: "School code is required" });

  }



  const scope = await resolveAuthScope(user, role);

  const permissions = await loadAuthSession(user.id);

  const redirect = await resolveLoginRedirect(scope);

  const now = new Date();



  await db.update(usersTable).set({ lastLoginAt: now }).where(eq(usersTable.id, user.id));



  return res.json({

    token: `token-${user.id}`,

    user: permissions!.user,

    permissions: permissions!.permissions,

    redirectPath: redirect.path,

    activeContext: redirect.activeContext,

  });

});



router.post("/auth/logout", async (_req, res) => {

  return res.json({ message: "Logged out successfully" });

});



router.get("/auth/me", async (req, res) => {
  const authReq = req as import("../lib/auth-context").AuthenticatedRequest;
  if (!authReq.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({
    ...authReq.auth.user,
    permissions: authReq.auth.permissions,
  });
});



router.post("/auth/password/forgot", async (_req, res) => {
  return res.status(501).json({
    error: "Not implemented",
    message: "Forgot password recovery is not yet available.",
  });
});



export default router;


