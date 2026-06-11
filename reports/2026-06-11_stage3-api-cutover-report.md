# Stage 3 — API Cutover Completion Report

**Date:** 2026-06-11  
**Status:** Complete  
**Prerequisite:** Stage 1 schema cutover (approved)  
**Explicitly deferred:** Stage 2 seed, Stage 4 frontend migration, UI work

---

## Executive Summary

Stage 3 rewrites the API layer to the Phase 0 authoritative schema. All 11 route modules were migrated from flat `/schools/:schoolId/*` paths to the **Platform → Society → School → Branch → Session** hierarchy. Legacy table symbols (`staffTable`, `activityTable`, `attendanceTable`) and legacy column names were removed from route handlers.

OpenAPI was fully rewritten (~44 endpoints). API clients (`@workspace/api-zod`, `@workspace/api-client-react`) were regenerated. **`pnpm build` is GREEN** (typecheck + api-server esbuild + school-os vite).

A **legacy-compat adapter** in `@workspace/api-client-react` preserves pre-Stage-4 frontend hook signatures without modifying UI pages.

---

## Findings

### Route changes

| Module | Before | After | Notes |
|--------|--------|-------|-------|
| `health.ts` | `/healthz` | unchanged | — |
| `auth.ts` | email/password `/auth/login` | OTP `/auth/otp/request`, `/auth/otp/verify` | Dev OTP `123456`; Bearer `token-{id}` retained |
| `schools.ts` | flat CRUD | merged into `organizations.ts` | Org hierarchy routes added |
| `organizations.ts` | — | **new** | societies, branches, sessions, schools |
| `students.ts` | `/schools/:schoolId/students/*` | `/branches/:branchId/sessions/:sessionId/students/*` | Uses `studentListSelect`, scope FKs |
| `staff.ts` | `/schools/:schoolId/staff/*` | **deleted** | Replaced by `users.ts` |
| `users.ts` | — | **new** | `/branches/:branchId/users/*` |
| `classes.ts` | school-scoped flat class | session-scoped + sections endpoints | `usersTable` for teacher name |
| `attendance.ts` | `attendanceTable` | `attendanceRecordsTable` | `attendanceDate`, `sectionId` |
| `fees.ts` | numeric strings | integer amounts + scope FKs | — |
| `announcements.ts` | `content`/`authorId` | `body`/`createdBy`, branch-scoped | Response aliases `content` |
| `dashboard.ts` | `activityTable`, counter columns | computed counts, `auditLogsTable` | `/branches/:branchId/dashboard`, `/societies/:societyId/dashboard` |
| `analytics.ts` | school-scoped | `/branches/:branchId/sessions/:sessionId/analytics/classes` | Added to OpenAPI |

### Removed legacy symbols

| Removed | Replacement |
|---------|-------------|
| `staffTable` | `usersTable` + `rolesTable` |
| `activityTable` | `auditLogsTable` |
| `attendanceTable` | `attendanceRecordsTable` |
| `schoolsTable.studentCount` / `staffCount` updates | computed at query time |
| email/password auth columns | mobile OTP + `roleId` |

### New supporting modules

| File | Purpose |
|------|---------|
| `src/lib/scope.ts` | `resolveSessionScope`, `resolveBranchScope`, `resolveCurrentSession` |
| `src/lib/student-select.ts` | Phase 0 student list projection |
| `src/lib/auth-helpers.ts` | Auth user shape + permission lookup |
| `src/lib/response-mappers.ts` | Legacy JSON field aliases for frontend compat (`dateOfBirth`, `content`, etc.) |
| `lib/api-client-react/src/legacy-compat.ts` | Pre-Stage-4 hook signature adapters (`useListStudents(schoolId, …)` → branch/session) |

### OpenAPI

- **File:** `lib/api-spec/openapi.yaml`
- **Version:** 0.1.0, OpenAPI 3.1.0
- **Endpoints:** 44 operations across 11 tags
- **Regeneration:** `pnpm --filter @workspace/api-spec run codegen`

### API client regeneration

| Package | Output | Notes |
|---------|--------|-------|
| `@workspace/api-zod` | `lib/api-zod/src/generated/api/api.ts` | Barrel updated: `src/index.ts` → `./generated/api/api` |
| `@workspace/api-client-react` | `lib/api-client-react/src/generated/*` | Public exports via `legacy-compat.ts` |

---

## Build verification

```
pnpm build → GREEN
├── pnpm run typecheck:libs     ✅
├── artifacts/api-server        ✅ typecheck + esbuild
├── artifacts/school-os         ✅ typecheck + vite build
└── artifacts/mockup-sandbox    ✅ typecheck
```

Prior to Stage 3: **68 TypeScript errors** in `@workspace/api-server` (missing `staffTable`, `attendanceTable`, legacy columns).

---

## Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| No seed data — API calls return 404/empty | **Active** | Stage 2 deferred by design; legacy-compat defaults `branchId=1`, `sessionId=1` |
| Frontend uses wrong scope at runtime | **Active** | Stage 4 will wire branch/session context; compat layer is typecheck-only bridge |
| OTP auth is dev-stub (`123456`) | **Expected** | Production SMS provider + session cookies in later stage |
| `legacy-compat.ts` masks API contract drift | **Low** | Removed in Stage 4 when pages migrate to new hooks |

---

## Recommendations (next steps — not started)

1. **Stage 2:** Run Ishita hierarchy seed (`db:push` + seed) so branch/session ID 1 resolves to real data.
2. **Stage 4:** Replace `legacy-compat.ts` with direct Phase 0 hooks; add `BranchSessionContext` to auth store.
3. **Auth hardening:** Session cookies, OTP provider, route guards via scope middleware.
4. **Delete** `lib/api-client-react/src/legacy-compat.ts` once frontend pages import generated hooks directly.

---

## Files touched (Stage 3 scope)

**Deleted:** `artifacts/api-server/src/routes/staff.ts`, `artifacts/api-server/src/routes/schools.ts`, `lib/api-zod/src/generated/api.ts` (stale)

**Created:** `organizations.ts`, `users.ts`, `auth-helpers.ts`, `response-mappers.ts`, `legacy-compat.ts`

**Rewritten:** `auth.ts`, `students.ts`, `classes.ts`, `attendance.ts`, `fees.ts`, `announcements.ts`, `dashboard.ts`, `analytics.ts`, `routes/index.ts`, `lib/api-spec/openapi.yaml`
