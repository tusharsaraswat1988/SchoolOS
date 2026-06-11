# Phase 0 Cutover — Migration Plan & Impact Analysis

**Date:** 2026-06-11  
**Status:** Pre-implementation — awaiting approval  
**Decision:** Phase 0 becomes the **only** authoritative architecture. Legacy SchoolOS schema, routes, and contracts are **replaced** — not bridged, not sidecarred.

---

## Executive Summary

SchoolOS currently runs on a **flat, school-centric** schema (`schools` as root tenant) with 32 API endpoints scoped as `/schools/:schoolId/*`. Phase 0 (`lib/db/src/schema/org-foundation.ts`) defines the accepted future model:

```
Platform → Society → School → Branch → Academic Session → Class → Section → Student
```

This report documents the **full cutover plan** to make Phase 0 the single runtime architecture. The migration eliminates nine legacy schema modules, retires `staff` and `activity` tables, replaces email/password auth with mobile OTP, and restructures all API routes around **branch + session** scope.

**No code has been written for this cutover.** This document is the approval gate.

| Dimension | Current (Legacy) | Target (Phase 0) |
|-----------|------------------|------------------|
| Schema | 9 modular files via `index.ts` | Single Phase 0 model (modularized from `org-foundation.ts`) |
| Tenant root | `schools` | `platforms` → `societies` → `schools` → `branches` |
| Auth | Email + password stub | Mobile + OTP + RBAC |
| API scope | `/schools/:schoolId/*` | `/branches/:branchId/sessions/:sessionId/*` |
| Staff | `staff` table | `users` + `roles` + assignments |
| Activity feed | `activity` table | `audit_logs` |
| Endpoints | 32 | ~40 |

**Estimated effort:** 20–30 dev-days (4–6 weeks solo; 2–3 weeks with two developers).

**Ishita target hierarchy (seed):**

- **Society:** Ishita Academy Society (`IAS`)
- **School:** Ishita School (`IS`)
- **Branches:** Gurudham Colony (`ISGC`, main) · Seer Goverdhanpur (`ISSG`)

---

## Findings

### 1. Current Architecture Inventory

#### 1.1 Legacy Schema (to be deleted)

| File | PG Table(s) | Used by API |
|------|-------------|-------------|
| `lib/db/src/schema/schools.ts` | `schools` | schools, students, staff, dashboard |
| `lib/db/src/schema/users.ts` | `users` | auth, announcements |
| `lib/db/src/schema/classes.ts` | `classes` | students, classes, attendance, fees, analytics |
| `lib/db/src/schema/students.ts` | `students` | students, classes, attendance, fees, dashboard |
| `lib/db/src/schema/staff.ts` | `staff` | staff, classes |
| `lib/db/src/schema/attendance.ts` | `attendance` | attendance, analytics, dashboard |
| `lib/db/src/schema/fees.ts` | `fee_records` | fees, analytics, dashboard |
| `lib/db/src/schema/announcements.ts` | `announcements` | announcements |
| `lib/db/src/schema/activity.ts` | `activity` | dashboard |

#### 1.2 Phase 0 Schema (to become authoritative)

Defined in `lib/db/src/schema/org-foundation.ts`. Currently **isolated** from the runtime barrel (`index.ts` excludes it to avoid symbol conflicts).

| Table | In TS | In PHASE0 doc |
|-------|-------|---------------|
| `platforms` | ✅ | ✅ |
| `societies` | ✅ | ✅ |
| `schools` (Phase 0 shape) | ✅ | ✅ |
| `branches` | ✅ | ✅ |
| `academic_sessions` | ✅ | ✅ |
| `roles`, `permissions`, `role_permissions`, `user_permissions` | ✅ | ✅ |
| `users` (Phase 0 shape) | ✅ | ✅ |
| `classes`, `sections`, `students` | ✅ | ✅ |
| `parents`, `audit_logs`, `otp_login_events` | ✅ | ✅ |
| `attendance_records`, `fee_records`, `announcements` | ✅ | ✅ |
| `user_role_assignments` | ❌ | ✅ |
| `role_branch_restrictions` | ❌ | ✅ |

**Gap:** `user_role_assignments` and `role_branch_restrictions` exist in `PHASE0_ARCHITECTURE.md` and drizzle meta snapshots but are **missing** from `org-foundation.ts`. Must be added before cutover.

#### 1.3 API Routes (32 endpoints today)

All mounted under `/api`. Key patterns:

```
GET  /schools/:schoolId/students
POST /schools/:schoolId/students
GET  /schools/:schoolId/classes
POST /schools/:schoolId/attendance
GET  /schools/:schoolId/fees
POST /auth/login                    # email + password stub
GET  /auth/me                       # returns schoolId only
```

**Notable gaps:**

- `GET /schools/:schoolId/analytics/classes` exists in code but **not** in OpenAPI
- Auth is stub-level: plaintext password compare, `Bearer token-{id}` tokens, no middleware
- Only 13 Zod schemas used for request bodies; query params and responses are ad hoc
- Phase 0 tables are not referenced by any route

#### 1.4 Frontend (13 pages, school-centric)

| Page | URL | Current data scope |
|------|-----|-------------------|
| Login | `/login` | Mock role picker — no API |
| Dashboard | `/dashboard` | `schoolId` from auth |
| Students | `/students`, `/students/new`, `/students/:id` | `schoolId \|\| 1` |
| Staff | `/staff` | `schoolId` |
| Classes | `/classes` | `schoolId` |
| Attendance | `/attendance` | `schoolId` + `classId` |
| Fees | `/fees` | `schoolId` |
| Announcements | `/announcements` | `schoolId` |
| Schools | `/schools` | Platform-wide list (super_admin) |
| Activity | `/activity` | `schoolId` |
| Analytics | `/analytics` | Raw `fetch` (not generated client) |

**Auth store** (`artifacts/school-os/src/lib/auth.ts`):

- Zustand mock login sets `schoolId: 1` for all roles
- `useLogin`, `useLogout`, `useGetMe` hooks exist but are **unused**
- `setAuthTokenGetter` in API client is **never wired**

### 2. Schema Column Mapping (Legacy → Phase 0)

#### Schools

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `id`, `name`, `code` | same | Keep |
| `address`, `city`, `state`, `phone`, `email` | — | Drop or extend Phase 0 |
| `principalName`, `logoUrl` | — | Drop or extend Phase 0 |
| `status` (`school_status`) | `status` (`org_entity_status`) | Replace enum |
| `subscriptionPlan`, `studentCount`, `staffCount` | — | Drop (compute at query time) |
| — | `societyId` | **Required** in Phase 0 |

#### Users

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `email`, `passwordHash` | — | **Remove** |
| `role` (enum) | `roleId` → `roles` | Replace |
| `schoolId` | `schoolId`, `societyId`, `branchId` | Expand scope |
| `avatarUrl` | — | Drop or extend |
| — | `mobile`, `otpBypassCode`, `lastLoginAt`, `status` | **Add** |

#### Classes

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `section` (text) | → `sections` table | Normalize |
| `grade` | `gradeOrder` | Rename |
| `classTeacherId` | `classTeacherUserId` | Rename FK |
| `schoolId` | `sessionId`, `branchId`, `societyId` | Rescope |
| — | `code`, `status` | **Add** |

#### Students

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `section` (text) | `sectionId` → `sections` | FK |
| `dateOfBirth` | `dob` | Rename |
| `parentPhone` | `parentMobile` | Rename |
| `rollNumber`, `middleName`, `bloodGroup`, `category`, `photoUrl`, `parentEmail` | — | **Decision needed** — extend schema or trim UI |
| — | `branchId`, `sessionId`, `societyId` | **Add** scope FKs |

#### Fees

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `amount`, `paidAmount` (numeric) | `amount`, `paidAmount` (integer) | Type change |
| `discount`, `paymentMethod` | — | **Decision needed** |
| `schoolId` | + `branchId`, `sessionId`, `societyId` | Rescope |

#### Attendance

| Legacy (`attendance`) | Phase 0 (`attendance_records`) | Action |
|-----------------------|-------------------------------|--------|
| `date` | `attendanceDate` | Rename |
| `schoolId` | + scope FKs + `sectionId` | Rescope |
| Table name | Different table | Replace |

#### Announcements

| Legacy Column | Phase 0 Column | Action |
|---------------|----------------|--------|
| `content` | `body` | Rename |
| `authorId` | `createdBy` | Rename |
| `schoolId` | + `branchId`, `societyId` | Rescope |

#### Eliminated Tables

| Legacy Table | Replacement |
|--------------|-------------|
| `staff` | `users` + `roles` + `user_role_assignments` |
| `activity` | `audit_logs` |

### 3. Target Route Hierarchy

Operations are **branch-scoped**; academic data is **session-scoped**.

#### Organization (new)

```
GET    /societies
GET    /societies/:societyId
GET    /societies/:societyId/schools
GET    /schools/:schoolId
PATCH  /schools/:schoolId
GET    /schools/:schoolId/branches
GET    /branches/:branchId
GET    /branches/:branchId/sessions
GET    /branches/:branchId/sessions/current
```

#### Auth (replaced)

```
POST   /auth/otp/request          # replaces POST /auth/login
POST   /auth/otp/verify           # replaces POST /auth/login
POST   /auth/logout
GET    /auth/me                   # expanded: societyId, branchId, permissions[]
```

#### Students

```
GET    /branches/:branchId/sessions/:sessionId/students
POST   /branches/:branchId/sessions/:sessionId/students
GET    /branches/:branchId/sessions/:sessionId/students/:studentId
PATCH  /branches/:branchId/sessions/:sessionId/students/:studentId
DELETE /branches/:branchId/sessions/:sessionId/students/:studentId
```

#### Classes & Sections

```
GET    /branches/:branchId/sessions/:sessionId/classes
POST   /branches/:branchId/sessions/:sessionId/classes
GET    /branches/:branchId/sessions/:sessionId/classes/:classId/sections
POST   /branches/:branchId/sessions/:sessionId/classes/:classId/sections
```

#### Users (replaces Staff)

```
GET    /branches/:branchId/users
POST   /branches/:branchId/users
GET    /branches/:branchId/users/:userId
PATCH  /branches/:branchId/users/:userId
```

#### Attendance, Fees, Announcements

```
GET|POST  /branches/:branchId/sessions/:sessionId/attendance
GET       /branches/:branchId/sessions/:sessionId/attendance/summary
GET|POST  /branches/:branchId/sessions/:sessionId/fees
POST      /branches/:branchId/sessions/:sessionId/fees/:feeId/pay
GET       /branches/:branchId/sessions/:sessionId/fees/summary
GET|POST  /branches/:branchId/announcements
DELETE    /branches/:branchId/announcements/:announcementId
```

#### Dashboard & Analytics

```
GET  /branches/:branchId/dashboard
GET  /branches/:branchId/audit-events        # replaces /dashboard/activity
GET  /societies/:societyId/dashboard         # replaces /dashboard/super-admin
GET  /branches/:branchId/sessions/:sessionId/analytics/classes
```

#### Unchanged

```
GET  /healthz
```

**32 legacy endpoints → ~40 target endpoints.**

### 4. Frontend Preservation Strategy

**Page URLs stay the same.** Data layer changes:

| Page | Preserved | Changes |
|------|-----------|---------|
| `/login` | Layout | OTP mobile entry |
| `/dashboard` | Layout + KPIs | `branchId` scoped hook |
| `/students/*` | Table + form layout | Section picker; `branchId` + `sessionId` |
| `/staff` | Table layout | Repurpose → branch users |
| `/classes` | Card grid | Session-scoped; sections sub-UI |
| `/attendance` | Class picker + grid | `sectionId` aware |
| `/fees` | Table + payment dialog | Integer amounts |
| `/announcements` | List + create | `body` field |
| `/schools` | List layout | Society → school → branch tree |
| `/activity` | Feed layout | Audit events |
| `/analytics` | Charts | Generated hook (remove raw `fetch`) |

**New UI components:**

- `BranchSessionContext` in auth/layout store
- Branch switcher (Gurudham ↔ Goverdhanpur)
- Current session badge

Example target auth context:

```typescript
interface AuthContext {
  userId: number;
  mobile: string;
  name: string;
  role: string;
  societyId: number;
  schoolId: number;
  branchId: number;      // selected branch
  sessionId: number;     // current academic session
  permissions: string[];
}
```

Example hook migration:

```typescript
// Before (legacy)
const schoolId = user?.schoolId || 1;
useListStudents(schoolId, { search });

// After (Phase 0)
const { branchId, sessionId } = useOrgContext();
useListStudents(branchId, sessionId, { search });
```

### 5. Migration Stages

```
Stage 0 — Prerequisites
  ├── Add user_role_assignments + role_branch_restrictions to schema
  ├── Decide UI field preservation (§ Decisions Required)
  └── Confirm fresh DB strategy

Stage 1 — Schema
  ├── Modularize org-foundation.ts into ~12 files
  ├── Rewrite index.ts barrel (Phase 0 only)
  ├── Delete 9 legacy schema files
  └── Regenerate drizzle meta

Stage 2 — Seed
  ├── Merge seed-phase0-foundation.ts into primary db:seed
  └── Seed Ishita hierarchy (IAS → IS → ISGC/ISSG)

Stage 3 — API + OpenAPI
  ├── Rewrite 11 route modules
  ├── Add auth + scope middleware
  ├── Rewrite openapi.yaml
  └── Regenerate api-zod + api-client-react

Stage 4 — Frontend
  ├── Wire OTP auth + /auth/me
  ├── Add branch/session context selector
  └── Migrate 13 pages to new hooks

Stage 5 — Verification
  ├── pnpm build / pnpm dev
  ├── Per-page smoke tests
  └── Update LOCAL_SETUP.md + PHASE0_ARCHITECTURE.md
```

---

## Risks

| Risk | Severity | Description | Mitigation |
|------|----------|-------------|------------|
| Destructive DB cutover | **High** | Legacy tables dropped; no bridge tables | Fresh DB for dev; backup production; confirm no migration needed |
| All 32 API endpoints break | **High** | Big-bang replacement; no API versioning | Regenerate client; coordinate frontend + API deploy |
| Incomplete Phase 0 schema | **High** | `user_role_assignments`, `role_branch_restrictions` missing from TS | Add before any route work |
| UI field loss | **Medium** | Phase 0 students lack `middleName`, `rollNumber`, `bloodGroup`, `parentEmail` | Extend single schema columns or trim UI — decide pre-code |
| Staff page breakage | **Medium** | No `staff` table; no `subject`/`salary` on `users` | Extend `users.metadata` JSONB or simplify Staff UI |
| Fee type change | **Medium** | Numeric → integer; no `discount`/`paymentMethod` | Extend `fee_records` or simplify Fees page |
| Frontend mock auth | **High** | Every page hardcodes `schoolId \|\| 1` | Branch/session context is blocking dependency |
| No auth middleware | **High** | Routes are unguarded today | Implement before production |
| Drizzle meta drift | **Medium** | Snapshots mix legacy + `org_*` prefixed tables | Reset meta on cutover |
| OpenAPI drift | **Low** | Analytics endpoint undocumented | Add to spec during rewrite |

---

## Recommendations

### 1. Approve big-bang cutover (no sidecar)

The architecture decision explicitly rules out bridge tables and duplicate schemas. Recommend:

- Single `db:push` on fresh or truncated database
- Simultaneous API + frontend + seed deploy
- No parallel `/schools/:schoolId/*` routes in production

### 2. Extend Phase 0 schema for UI preservation (recommended)

To preserve existing form fields without duplicate schemas, add columns to the **single** Phase 0 `students` and `fee_records` tables:

```typescript
// Recommended additions to students (single schema, not a sidecar)
rollNumber: text("roll_number"),
middleName: text("middle_name"),
bloodGroup: text("blood_group"),
parentEmail: text("parent_email"),
photoUrl: text("photo_url"),

// Recommended additions to fee_records
discount: integer("discount").default(0),
paymentMethod: text("payment_method"),
```

### 3. Use session cookie auth

`SESSION_SECRET` already exists in `.env`. Session cookies align with `POST /auth/logout` and avoid token storage in frontend.

### 4. Default org context on login

Auto-select on successful OTP verify:

- **Branch:** Gurudham Colony (`isMain: true`, code `ISGC`)
- **Session:** Current session (`isCurrent: true`)

### 5. Implementation order

```
1. Schema + missing RBAC tables
2. db:push + Ishita seed
3. Auth (OTP + middleware)
4. Org routes (societies, branches, sessions)
5. Students → Classes → Sections
6. Attendance → Fees → Announcements
7. Dashboard → Audit → Analytics
8. OpenAPI regen
9. Frontend auth + context selector
10. Page-by-page hook migration
11. Delete legacy files
12. Docs + verify script
```

### 6. Effort estimate

| Workstream | Dev-days |
|------------|----------|
| Schema modularization + RBAC tables | 2–3 |
| DB push + seed | 1–2 |
| API route rewrite | 5–7 |
| Auth middleware + OTP | 2–3 |
| OpenAPI + Orval regen | 2–3 |
| Frontend (13 pages + context) | 5–7 |
| Testing + fixes | 3–5 |
| **Total** | **20–30** |

---

## Next Steps

### Decisions required before implementation

| # | Decision | Options |
|---|----------|---------|
| 1 | UI field preservation | A) Extend Phase 0 columns · B) Trim forms |
| 2 | Staff → Users metadata | A) `users.metadata` JSONB · B) Drop subject/salary from UI |
| 3 | Fees extras | A) Keep discount/paymentMethod in schema · B) Simplify UI |
| 4 | Auth token | A) Session cookie (recommended) · B) JWT |
| 5 | DB strategy | A) Fresh `db:push` (recommended) · B) Production data migration |
| 6 | Default branch on login | A) Gurudham (`isMain`) · B) User picks each time |

### Approval checklist

- [ ] Route hierarchy approved: `/branches/:branchId/sessions/:sessionId/*`
- [ ] Big-bang cutover confirmed (no bridge/sidecar)
- [ ] Six decisions above resolved
- [ ] UI field preservation strategy chosen
- [ ] Implementation order accepted

### On approval

Begin Stage 1 (schema) immediately. First deliverable: modularized Phase 0 schema with `user_role_assignments` and `role_branch_restrictions`, passing `pnpm build`.

---

## Files Impacted (planned)

### To delete (12 files)

```
lib/db/src/schema/schools.ts
lib/db/src/schema/users.ts
lib/db/src/schema/classes.ts
lib/db/src/schema/students.ts
lib/db/src/schema/staff.ts
lib/db/src/schema/attendance.ts
lib/db/src/schema/fees.ts
lib/db/src/schema/announcements.ts
lib/db/src/schema/activity.ts
artifacts/api-server/src/routes/staff.ts
lib/db/src/seed-phase0-runner.ts          # merged into primary seed
@workspace/db/schema/phase0 export        # removed from package.json
```

### To create (8+ files)

```
lib/db/src/schema/platforms.ts            # split from org-foundation
lib/db/src/schema/societies.ts
lib/db/src/schema/branches.ts
lib/db/src/schema/academic-sessions.ts
lib/db/src/schema/sections.ts
lib/db/src/schema/roles.ts                # roles + permissions + assignments
lib/db/src/schema/audit.ts
lib/db/src/schema/otp.ts
artifacts/api-server/src/middleware/auth.ts
artifacts/api-server/src/middleware/scope.ts
artifacts/api-server/src/routes/users.ts    # replaces staff.ts
```

### To modify (~40 files)

```
lib/db/src/schema/index.ts
lib/db/src/schema/org-foundation.ts         # split or rename
lib/db/src/index.ts
lib/db/drizzle.config.ts
lib/db/package.json
lib/db/src/seed-phase0-foundation.ts
artifacts/api-server/src/routes/*.ts      # 10 route files
lib/api-spec/openapi.yaml
lib/api-zod/src/generated/api.ts          # regenerated
lib/api-client-react/src/generated/*      # regenerated
artifacts/school-os/src/lib/auth.ts
artifacts/school-os/src/components/layout.tsx
artifacts/school-os/src/pages/*.tsx         # 13 pages
LOCAL_SETUP.md
PHASE0_ARCHITECTURE.md
scripts/verify-db.mjs
package.json                              # db:seed script
```

**Total: ~55–60 files** (12 deleted, 8+ new, rest modified/regenerated).

---

## Files Changed

| File | Action |
|------|--------|
| `reports/2026-06-11_phase0-cutover-migration-plan.md` | **Created** (this report) |

*No application code was modified. This is a planning document only.*

---

## Commands Executed

```powershell
# Create reports directory
New-Item -ItemType Directory -Path reports

# Verify build status at time of report
cd C:\main\schoolOS
pnpm build
```

---

## Build Status

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm build` | **PASS** (exit 0) | Typecheck + API esbuild + Vite production build completed 2026-06-11 |

```
✓ tsc --build
✓ artifacts/api-server typecheck
✓ artifacts/school-os typecheck
✓ vite build — 2461 modules, built in ~17s
```

---

## Dev Status

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm dev` | **Environment-dependent** | Requires ports 5000 (API) and 5173 (Vite) free |

When ports are occupied, dev fails with `EADDRINUSE`. Resolution:

```powershell
taskkill /F /IM node.exe
pnpm dev
```

Last verified healthy state (prior session): API listening on `:5000`, Vite on `:5173`.

**Post-cutover:** Dev status will be re-verified after implementation. Cutover is expected to break dev until all stages complete.

---

*Report generated 2026-06-11. Awaiting approval before implementation.*
