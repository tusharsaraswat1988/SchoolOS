# Stage 1 — Schema Cutover Completion Report

**Date:** 2026-06-11  
**Status:** Complete (schema layer only)  
**Approved:** Phase 0 as authoritative architecture (with UI field extensions)

---

## Executive Summary

Stage 1 replaces the legacy SchoolOS schema with a **single modular Phase 0 schema**. Nine legacy table modules and `org-foundation.ts` were removed. Phase 0 is now exported exclusively through `lib/db/src/schema/index.ts`.

Added missing RBAC tables (`user_role_assignments`, `role_branch_restrictions`) and approved UI-preservation columns on `students` and `fee_records`. Added `users.metadata` JSONB for staff-equivalent fields.

**`pnpm run typecheck:libs` passes.** Full `pnpm build` fails at API typecheck — expected until Stage 3 (API rewrite).

---

## Findings

### Schema modules created (18 files)

| File | Contents |
|------|----------|
| `enums.ts` | All Phase 0 + `restriction_entity_type`, `payment_method` enums |
| `platforms.ts` | `platforms` |
| `societies.ts` | `societies` |
| `schools.ts` | Phase 0 `schools` (society FK) |
| `branches.ts` | `branches` |
| `academic-sessions.ts` | `academic_sessions` |
| `roles.ts` | `roles`, `permissions`, `role_permissions` |
| `users.ts` | `users`, `user_permissions`, `otp_login_events` |
| `classes.ts` | Phase 0 `classes` |
| `sections.ts` | `sections` |
| `students.ts` | `students`, `parents` |
| `rbac-assignments.ts` | `user_role_assignments`, `role_branch_restrictions` |
| `attendance.ts` | `attendance_records` |
| `fees.ts` | `fee_records` (+ `discount`, `payment_method`) |
| `announcements.ts` | Phase 0 `announcements` |
| `audit.ts` | `audit_logs` |
| `relations.ts` | All Drizzle relations |
| `insert-schemas.ts` | Zod insert schemas + types |
| `index.ts` | Authoritative barrel |

### Files deleted (4)

| File | Reason |
|------|--------|
| `org-foundation.ts` | Split into modular files |
| `activity.ts` | Replaced by `audit_logs` |
| `staff.ts` | Replaced by `users` + RBAC |
| Legacy content in `schools.ts`, `users.ts`, etc. | Overwritten with Phase 0 definitions |

### Approved modifications (vs base Phase 0)

**`students` — UI preservation columns:**

```typescript
rollNumber: text("roll_number"),
middleName: text("middle_name"),
bloodGroup: text("blood_group"),
photoUrl: text("photo_url"),
parentEmail: text("parent_email"),
```

**`fee_records` — UI preservation columns:**

```typescript
discount: integer("discount").notNull().default(0),
paymentMethod: paymentMethodEnum("payment_method"),
```

**`users` — staff metadata:**

```typescript
metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
```

### Export changes

- Removed `@workspace/db/schema/phase0` package export
- `seed-phase0-foundation.ts` now imports from `./schema` (main barrel)
- `drizzle.config.ts` points at Phase 0 barrel only

### Hierarchy (frozen)

```
Platform → Society → School → Branch → Academic Session → Class → Section → Student
```

---

## Risks

| Risk | Status |
|------|--------|
| API routes reference deleted symbols (`staffTable`, `attendanceTable`, `activityTable`) | **Active** — Stage 3 will fix |
| Legacy column names in routes (`email`, `content`, `dateOfBirth`, `section`) | **Active** — Stage 3 will fix |
| Database still has legacy tables until `db:push` | **Pending** — run after approval of DB reset |
| Drizzle meta snapshots out of date | **Pending** — regenerate on next push |

---

## Recommendations

1. **Proceed to Stage 2 (Seed)** — wire Ishita hierarchy to primary `db:seed` script.
2. **Before `db:push`** — confirm fresh DB or backup; cutover drops incompatible legacy tables.
3. **Stage 3 (API)** is the critical path to restore `pnpm build`.

---

## Next Steps

| Stage | Work |
|-------|------|
| **Stage 2** | Merge seed into `pnpm db:seed`; Ishita IAS → IS → ISGC/ISSG |
| **Stage 3** | Rewrite API routes + OpenAPI to branch/session paths |
| **Stage 4** | Frontend auth + org context |
| **Stage 5** | `db:push`, smoke tests, docs |

---

## Files Changed

### Created

```
lib/db/src/schema/enums.ts
lib/db/src/schema/platforms.ts
lib/db/src/schema/societies.ts
lib/db/src/schema/branches.ts
lib/db/src/schema/academic-sessions.ts
lib/db/src/schema/rbac-assignments.ts
lib/db/src/schema/relations.ts
lib/db/src/schema/insert-schemas.ts
reports/2026-06-11_stage1-schema-cutover-report.md
```

### Overwritten (Phase 0 content)

```
lib/db/src/schema/schools.ts
lib/db/src/schema/users.ts
lib/db/src/schema/classes.ts
lib/db/src/schema/students.ts
lib/db/src/schema/attendance.ts
lib/db/src/schema/fees.ts
lib/db/src/schema/announcements.ts
lib/db/src/schema/index.ts
```

### Deleted

```
lib/db/src/schema/org-foundation.ts
lib/db/src/schema/activity.ts
lib/db/src/schema/staff.ts
```

### Modified

```
lib/db/src/seed-phase0-foundation.ts
lib/db/package.json
lib/db/drizzle.config.ts
```

---

## Commands Executed

```powershell
cd C:\main\schoolOS
pnpm run typecheck:libs          # PASS
pnpm -r --filter "./artifacts/**" run typecheck   # FAIL (expected — API not migrated)
```

---

## Build Status

| Command | Result |
|---------|--------|
| `pnpm run typecheck:libs` | **PASS** |
| `pnpm build` | **FAIL** at `artifacts/api-server typecheck` — legacy route imports |

API errors are expected: routes still import `staffTable`, `attendanceTable`, `activityTable` and use legacy column names.

---

## Dev Status

| Command | Result |
|---------|--------|
| `pnpm dev` | **Not verified post-cutover** — API will not compile until Stage 3 |

---

*Stage 1 complete. Ready for Stage 2 (Seed) on approval.*
