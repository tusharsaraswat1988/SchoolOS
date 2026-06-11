# Post-Seed System Verification Report

**Date:** 2026-06-11  
**Environment:** Local dev (`pnpm dev` — API `:5000`, web `:5173`)  
**Database:** Neon PostgreSQL (Phase 0 schema + Ishita foundation seed)  
**Overall status:** **PASS with blockers** (9/10 checks pass; Cloudinary upload blocked by invalid credentials)

---

## Executive summary

Post-seed verification was run against the live API and database without code changes. All 144 seeded users authenticate via OTP. Organizational hierarchy, student–parent links, RBAC assignments, and dashboard aggregates match expected seed counts. Cloudinary env loading works, but a live upload to Cloudinary fails with HTTP 401 because `.env` still contains placeholder API credentials.

---

## Verification results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Login works for all seeded users | **PASS** | 144/144 users: OTP request → verify → `/auth/me` |
| 2 | OTP authentication works | **PASS** | Invalid OTP `999999` → 401; dev OTP `123456` → 200 |
| 3 | Society hierarchy correctly linked | **PASS** | `IAS` → `platformId: 1` (SCHOOLOS) |
| 4 | School hierarchy correctly linked | **PASS** | `IS` → `societyId: 1` (IAS) |
| 5 | Branch hierarchy correctly linked | **PASS** | ISGC + ISSG → `societyId: 1`, `schoolId: 1` |
| 6 | Student–parent relationships correct | **PASS** | 110 parents; 0 students without parent; 0 mobile mismatches |
| 7 | Roles and permissions assigned | **PASS** | 59 role-permission rows; 110 parent user-permission overrides |
| 8 | Dashboard counts correct | **PASS** | Branch + society API totals match DB queries |
| 9 | Cloudinary configuration loads from `.env` | **PASS** | All 3 vars set; `isCloudinaryConfigured()` → `true` |
| 10 | Test one image upload end-to-end | **FAIL** | Service upload → Cloudinary 401 `Invalid api_key YOUR_API_KEY` |

---

## Seed counts (live database)

| Entity | Count | Expected |
|--------|------:|----------|
| Roles | 9 | 9 system roles |
| Permissions | 15 | RBAC matrix |
| Users | 144 | Admins + staff + teachers + parents |
| Branches | 2 | ISGC, ISSG |
| Sessions | 2 | 2026-27 per branch |
| Classes | 22 | 11 per branch |
| Sections | 22 | Section A per class |
| Students | 110 | 5 × 11 classes × 2 branches |
| Parents | 110 | 1 primary parent per student |
| Attendance records | 30 | 15 per branch |
| Fee records | 30 | 15 per branch |
| Announcements | 20 | 10 per branch |
| Audit logs | 20 | 10 per branch |

### Users by role

| Role | Count |
|------|------:|
| super_admin | 1 |
| society_admin | 1 |
| school_admin | 2 |
| principal | 2 |
| coordinator | 4 |
| accountant | 4 |
| teacher | 20 |
| parent | 110 |

---

## Hierarchy verification

```
Platform  SCHOOLOS (id: 1)
  └── Society  IAS — Ishita Academy Society (id: 1, platformId: 1) ✓
        └── School  IS — Ishita School (id: 1, societyId: 1) ✓
              ├── Branch  ISGC — Gurudham Colony (id: 1, isMain: true) ✓
              │     └── Session  2026-27 (id: 1)
              └── Branch  ISSG — Seer Goverdhanpur (id: 2, isMain: false) ✓
                    └── Session  2026-27 (id: 2)
```

---

## Authentication verification

### All-user login sweep (API)

Automated loop over all 144 users:

- `POST /api/auth/otp/request` with each `mobile`
- `POST /api/auth/otp/verify` with OTP `123456`
- `GET /api/auth/me` with Bearer `token-{userId}`

**Result:** `passed: 144`, `failed: 0`

### OTP spot checks

| Mobile | Role | Invalid OTP | Valid OTP | Permissions |
|--------|------|-------------|-----------|-------------|
| 8707488250 | super_admin | 401 ✓ | 200 ✓ | 15 (all) |
| 9151119959 | society_admin | 401 ✓ | 200 ✓ | 12 |
| 8701000001 | principal (ISGC) | 401 ✓ | 200 ✓ | 8 |
| 8910000001 | parent (ISGC) | 401 ✓ | 200 ✓ | 2 |

Dev OTP is hard-coded as `123456` in `artifacts/api-server/src/routes/auth.ts`.

---

## Student–parent verification

| Check | Result |
|-------|--------|
| Students without a `parents` row | 0 |
| `students.parent_mobile` ≠ linked parent `users.mobile` | 0 |
| Primary parent relationship | `father`, `isPrimary: true` per student |

Parent user mobiles follow pattern `891xxxxxxx` (ISGC) / `892xxxxxxx` (ISSG).

---

## RBAC verification

| Metric | Value |
|--------|------:|
| Role-permission mappings (`role_permissions`) | 59 |
| User-permission overrides (`user_permissions`) | 110 (parent `parent.child_read` scope) |

Sample permission sets confirmed via `/auth/me` for super_admin, society_admin, principal, and parent (see OTP spot checks above).

---

## Dashboard verification

Compared API responses to direct DB counts.

### Branch dashboard — ISGC (`GET /api/branches/1/dashboard?sessionId=1`)

| Metric | API | DB expected | Match |
|--------|----:|------------:|-------|
| studentCount | 55 | 55 | ✓ |
| staffCount | 71 | 71 | ✓ |
| pendingFees | ₹20,000 | — | ✓ (seed fee mix) |

### Branch dashboard — ISSG (`GET /api/branches/2/dashboard?sessionId=2`)

| Metric | API | DB expected | Match |
|--------|----:|------------:|-------|
| studentCount | 55 | 55 | ✓ |
| staffCount | 71 | 71 | ✓ |
| pendingFees | ₹20,000 | — | ✓ |

### Society dashboard — IAS (`GET /api/societies/1/dashboard`)

| Metric | API | Expected | Match |
|--------|----:|---------:|-------|
| totalStudents | 110 | 110 | ✓ |
| totalBranches | 2 | 2 | ✓ |
| totalSchools | 1 | 1 | ✓ |

**Note:** `attendanceRate` is 0% on verification day because sample attendance dates are in July 2026, not today (2026-06-11). This is expected seed behavior, not a count bug.

---

## Cloudinary verification

### Configuration (check #9) — PASS

| Variable | Status |
|----------|--------|
| `CLOUDINARY_CLOUD_NAME` | Set (9 chars) |
| `CLOUDINARY_API_KEY` | Set (12 chars) |
| `CLOUDINARY_API_SECRET` | Set (19 chars) |
| `isCloudinaryConfigured()` | `true` |

### Upload test (check #10) — FAIL

Attempted `cloudinaryService.uploadStudentPhoto()` with a 1×1 PNG for student `ISGC0001`:

```json
{
  "message": "Invalid api_key YOUR_API_KEY",
  "http_code": 401
}
```

The env vars are present but contain **placeholder values**, not live Cloudinary credentials. No HTTP upload route exists yet (documented as future work in `reports/cloudinary-setup.md`); verification used the service layer directly.

---

## Screenshots

| File | Description |
|------|-------------|
| [screenshots/01-login-role-picker.png](./screenshots/01-login-role-picker.png) | Frontend login — mock role picker (Stage 4 not wired to OTP API) |
| [screenshots/02-dashboard-isgc-principal.png](./screenshots/02-dashboard-isgc-principal.png) | Dashboard after principal login — 55 students, 71 staff, fee KPIs |

Dashboard UI reads seeded ISGC branch data via legacy-compat hooks (`branchId=1`, `sessionId=1`).

---

## Blockers

| Priority | Blocker | Impact |
|----------|---------|--------|
| **P1** | Cloudinary `.env` credentials are placeholders (`YOUR_API_KEY`) | Image upload to Cloudinary fails with 401 |
| **P2** | Frontend login is mock role selection, not OTP flow | UI login does not exercise `/auth/otp/*` (API auth verified separately) |
| **P3** | No HTTP photo upload route implemented | Full browser → API → Cloudinary → DB E2E path not available yet |

---

## How verification was run

- **Services:** `pnpm dev` (API + Vite already running)
- **API base:** `http://localhost:5000/api`
- **Auth flow:** OTP request/verify + Bearer token for all 144 users
- **DB queries:** Drizzle against live Neon via `DATABASE_URL`
- **Cloudinary:** `@workspace/cloudinary` service upload + cleanup delete
- **UI:** Browser capture at `http://localhost:5173`

No application code or seed data was modified during this verification.

---

## Recommended next steps (out of scope for this report)

1. Replace Cloudinary placeholder credentials in `.env` with valid console values.
2. Wire frontend login to OTP API (Stage 4).
3. Implement `POST /api/.../photo` upload route per `reports/cloudinary-setup.md`.
