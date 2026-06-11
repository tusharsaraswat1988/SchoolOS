# SchoolOS Auth Rebuild — Implementation Report

**Date:** 2026-06-12  
**Status:** Implemented (Phase 1.5 credential login)

---

## 1. Audit Report (Pre-Implementation)

### User table — before

| Column | Existed |
|--------|---------|
| `id` | Yes |
| `user_code` | **No** |
| `password_hash` | **No** |
| `role_id` | Yes |
| `society_id` | Yes |
| `school_id` | Yes |
| `branch_id` | Yes |
| `mobile` | Yes |
| `email` | **No** |
| `status` | Yes |
| `last_login_at` | Yes |
| `student_id` | **No** (parent link via `parents` table only) |

### Auth — before

- Mock role picker (`login(role)`)
- Hardcoded `schoolId/branchId/sessionId = 1`
- OTP login at API layer (unused by UI)
- No route guards
- No platform dashboard
- `legacy-compat.ts` forced `DEFAULT_BRANCH_ID = 1`

### Auth — after

- School Code + User ID + Access Code + Math Captcha
- Role from database only
- Bearer token + `/auth/me` hydration
- Role-aware `useScope()` (no fallbacks)
- Protected routes by role + scope tier
- `/platform` dashboard with system stats

---

## 2. DB Changes

### Migration

`lib/db/drizzle/0004_auth_credentials.sql`

- `users.user_code` (unique)
- `users.password_hash`
- `users.email`
- `users.student_id` (FK → students, nullable)

### Schema

`lib/db/src/schema/users.ts` updated.

### Seed

- `lib/db/src/password.ts` — scrypt hash helper
- All seeded users receive `userCode` + `passwordHash`
- Default dev password: **`SchoolOS@123`**
- `backfillMissingCredentials()` for legacy rows

---

## 3. API Changes

| File | Change |
|------|--------|
| `routes/auth.ts` | Removed OTP routes; added `GET /auth/captcha`, `POST /auth/login`, stub `POST /auth/password/forgot` |
| `lib/password.ts` | scrypt hash/verify |
| `lib/captcha.ts` | Signed math captcha (no external service) |
| `lib/auth-scope.ts` | Scope resolution + school code validation |
| `lib/auth-redirect.ts` | Role-based `redirectPath` + `activeContext` |
| `lib/auth-helpers.ts` | Extended user payload with `roleScope`, `sessionId`, `studentId` |
| `routes/dashboard.ts` | `GET /platform/dashboard` |

### Login response shape

```json
{
  "token": "token-1",
  "user": { "userCode", "role", "roleScope", "societyId", "schoolId", "branchId", "sessionId", "studentId", ... },
  "permissions": ["..."],
  "redirectPath": "/platform",
  "activeContext": null
}
```

---

## 4. UI Changes

| File | Change |
|------|--------|
| `lib/auth.ts` | Zustand store: token, user, permissions, activeContext, login/logout/hydrate |
| `lib/auth-api.ts` | Fetch wrappers for captcha/login/me |
| `lib/auth-types.ts` | Role + scope types |
| `lib/use-scope.ts` | Role-aware scope (no `?? 1` fallbacks) |
| `lib/route-guard.tsx` | `ProtectedRoute` + `defaultHomeForRole()` |
| `pages/login.tsx` | Credential + captcha form |
| `pages/platform.tsx` | Platform dashboard |
| `pages/society-dashboard.tsx` | Society admin home |
| `pages/select-branch.tsx` | School admin branch picker |
| `pages/teacher-dashboard.tsx` | Teacher landing |
| `pages/accounts-dashboard.tsx` | Accountant landing |
| `pages/parent-dashboard.tsx` | Parent portal (limited nav) |
| `pages/student-dashboard.tsx` | Student portal |
| `App.tsx` | Protected routes wired |
| `components/layout.tsx` | Role-based nav; portal variant |
| `legacy-compat.ts` | Requires real `branchId`/`sessionId`; removed defaults |

**Removed:** mock role picker, `ROLE_NAMES`, `ROLE_EMAILS`, `login(role)`, OTP hooks from client exports.

---

## 5. Updated Hierarchy Diagram

```
Platform Owner (super_admin)          → /platform
    └── Society (society_admin)       → /societies/:societyId
            └── School (school_admin) → /select-branch or /dashboard
                    └── Branch
                            └── Session
                                    ├── Principal (principal)     → /dashboard
                                    ├── Coordinator (coordinator) → /dashboard
                                    ├── Teacher (teacher)         → /teacher/dashboard
                                    ├── Accountant (accountant)   → /accounts/dashboard
                                    ├── Parent (parent)           → /parent/dashboard (studentId scope)
                                    └── Student (student)         → /student/dashboard (studentId scope)
```

---

## 6. Test Credentials

**Default password (all seeded users):** `SchoolOS@123`

| Role | User ID | School Code | Landing |
|------|---------|-------------|---------|
| Super Admin | `SUPER0001` | *(optional)* | `/platform` |
| Society Admin | `SOC0001` | *(optional)* | `/societies/1` |
| School Admin | `SCHADMIN0001` | `IS` | `/select-branch` (2 branches) |
| Principal (ISGC) | `PRN0001` | `IS` | `/dashboard` |
| Principal (ISSG) | `PRN0002` | `IS` | `/dashboard` |
| Teacher | `TCHR0001` | `IS` | `/teacher/dashboard` |
| Accountant | `ACCT0001` | `IS` | `/accounts/dashboard` |
| Coordinator | `COORD0001` | `IS` | `/dashboard` |
| Parent | `PAR0001` | `IS` | `/parent/dashboard` |

Captcha: solve the math question shown on login (e.g. `8 + 5 = 13`).

---

## 7. Remaining Technical Debt

1. **API route auth middleware** — endpoints still public; scope enforcement is UI-only for now.
2. **OpenAPI spec** — still documents OTP; needs update + client regen for `society_admin`, login endpoints.
3. **Page migration** — some ops pages (fees, attendance, staff, analytics, etc.) still need branch/session param updates if not yet migrated.
4. **Parent/student portals** — shell pages only; student-scoped API endpoints not built.
5. **Forgot password** — stub at `POST /auth/password/forgot` (501); architecture reserved for OTP/recovery.
6. **Student role users** — seed creates parents only; no `STU0001` users yet.
7. **OTP tables/routes** — removed from active auth path; `otp_login_events` retained for future recovery flows.
8. **`pnpm dev`** — run via root script so API uses `:5000` and web `:5173` (do not rely on `.env` PORT alone for API).

---

## 8. Files Changed (Summary)

**DB:** `users.ts`, `0004_auth_credentials.sql`, `password.ts`, `seed-phase0-foundation.ts`  
**API:** `auth.ts`, `auth-helpers.ts`, `password.ts`, `captcha.ts`, `auth-scope.ts`, `auth-redirect.ts`, `dashboard.ts`  
**Web:** `auth.ts`, `auth-api.ts`, `auth-types.ts`, `use-scope.ts`, `route-guard.tsx`, `login.tsx`, `App.tsx`, `layout.tsx`, `platform.tsx`, + role dashboards, `legacy-compat.ts`, `dashboard.tsx`, `students.tsx`, `classes.tsx`

---

## 9. Verification

API login tested successfully:

- `SUPER0001` → `redirectPath: /platform`, null scope
- `PRN0001` + school `IS` → `redirectPath: /dashboard`, `branchId: 1`, `sessionId: 1`

Run locally:

```bash
pnpm dev
# Open http://localhost:5173/login
```
