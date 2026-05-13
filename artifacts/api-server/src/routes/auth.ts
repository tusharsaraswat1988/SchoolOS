import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { email, password } = parsed.data;
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!users.length || users[0].passwordHash !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const user = users[0];
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    token: `token-${user.id}`,
  });
});

router.post("/auth/logout", async (_req, res) => {
  return res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const tokenUserId = authHeader.replace("Bearer token-", "");
  const users = await db.select().from(usersTable).where(eq(usersTable.id, Number(tokenUserId))).limit(1);
  if (!users.length) return res.status(401).json({ error: "Unauthorized" });
  const user = users[0];
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
});

export default router;
