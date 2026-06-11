# SchoolOS Phase 0 Foundation Architecture

This document defines **Phase 0 only**:

- hierarchy foundation
- role/permission model
- branch restriction model
- audit log model

No UI, attendance, fees, or student-feature workflows are implemented here.

## 1) Hierarchy Model

Implemented in `lib/db/src/schema/org-foundation.ts`.

Fixed hierarchy:

`Platform -> Society -> School -> Branch -> Academic Session -> Class -> Section -> Student`

Design decisions:

- Every node has `status`, `createdAt`, `updatedAt` for operational lifecycle.
- Codes are unique per parent scope (for example, `org_branches` has unique `(school_id, code)`).
- Parent-child FKs use `ON DELETE CASCADE` for administrative tree operations (except student section reference).
- `org_students.section_id` uses `ON DELETE RESTRICT` so section deletion cannot silently orphan students.
- Academic session correctness is enforced by check:
  - `starts_on < ends_on`.
- Section capacity correctness is enforced by check:
  - `capacity IS NULL OR capacity > 0`.

## 2) Permission Architecture

Implemented in `lib/db/src/schema/auth-foundation.ts`:

- `system_users`
- `system_roles`
- `system_permissions`
- `role_permissions` (role -> permission matrix)
- `user_role_assignments` (user -> role at scope)
- `role_branch_restrictions` (fine-grained allow/deny targeting)

### 2.1 Role Model

Role hierarchy represented by records in `system_roles`:

- society_admin
- school_admin
- principal
- coordinator
- accountant
- teacher
- parent
- student

`system_role_scope` enum is constrained to:

- `platform`, `society`, `school`, `branch`

### 2.2 Permission Model

Permissions are atomic keys in `system_permissions` (for example: `hierarchy.read`).

Role grants are many-to-many in `role_permissions` with:

- composite PK `(role_id, permission_id)`
- optional `conditions` JSON for future ABAC conditions

### 2.3 Assignment and Scope

`user_role_assignments` links a user to a role and scope dimensions:

- `society_id`
- `school_id`
- `branch_id`

Guardrail check:

- at least one of `(society_id, school_id, branch_id)` must be non-null.

This prevents "global by accident" assignments.

### 2.4 Branch Restriction Model

`role_branch_restrictions` stores post-assignment restrictions.

Supported targets by enum `restriction_entity_type`:

- `branch`
- `session`
- `class`
- `section`
- `student`

Columns:

- `branch_id`
- `session_id`
- `class_id`
- `section_id`
- `student_id`

Guardrails:

- Must target at least one entity id.
- Must target **exactly one matching id** according to `entity_type`.
- Unique guard on `(assignment_id, entity_type, branch_id, session_id, class_id, section_id, student_id)`.

This provides deterministic policy behavior and avoids duplicate/ambiguous restriction rows.

## 3) Audit Log Architecture

Implemented in `lib/db/src/schema/audit-foundation.ts` (`audit_logs` table).

Core columns:

- actor identity: `actor_user_id`
- action + outcome: `action`, `outcome`
- target: `entity_type`, `entity_id`, optional `entity_label`
- change payload: `before_data`, `after_data`, `metadata`
- request tracing: `request_id`, `ip_address`, `user_agent`
- hierarchy context: `society_id`, `school_id`, `branch_id`
- time: `occurred_at`, `created_at`

Design decisions:

- append-only event style table (no update semantics intended)
- hierarchy context embedded for fast scoped querying
- JSONB payloads for flexible and future-proof diffs/metadata
- indexes on actor, entity, hierarchy, request, and occurred time

## 4) Relationships

### Hierarchy relations

- `org_platforms` 1-* `org_societies`
- `org_societies` 1-* `org_schools`
- `org_schools` 1-* `org_branches`
- `org_branches` 1-* `org_academic_sessions`
- `org_academic_sessions` 1-* `org_classes`
- `org_classes` 1-* `org_sections`
- `org_sections` 1-* `org_students`

### Access-control relations

- `system_users` 1-* `user_role_assignments`
- `system_roles` 1-* `user_role_assignments`
- `system_roles` *-* `system_permissions` via `role_permissions`
- `user_role_assignments` 1-* `role_branch_restrictions`

### Audit relations

- `audit_logs.actor_user_id -> system_users.id`
- optional hierarchy FKs to society/school/branch for scoping

## 5) Migrations

Migration SQL files generated under:

- `lib/db/drizzle/0001_phase0_foundation_hardening.sql`

Contains:

- check on assignment scope presence

The foundational Phase 0 tables and constraints are reflected in schema files and included in DB push flow (`drizzle-kit push`).

## 6) Seed Baseline

`lib/db/src/seed-phase0-foundation.ts` seeds:

- system roles
- base permissions
- role-permission grants

Runner:

- `lib/db/src/seed-phase0-runner.ts`
- command: `pnpm --filter @workspace/db run seed:phase0`

## 7) Why this architecture

- Keeps hierarchy immutable and explicit from day one.
- Separates role definition, permission definition, assignment, and restriction for clean authorization reasoning.
- Adds DB-level safety checks to block invalid policy states.
- Audit logs are designed for forensic traceability and scoped compliance queries.
