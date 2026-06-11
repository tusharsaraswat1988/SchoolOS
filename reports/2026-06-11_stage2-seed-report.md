# Stage 2 — Seed Implementation Report

**Date:** 2026-06-11  
**Status:** Complete  
**Database:** Neon (`neondb`) — full reset + Phase 0 schema + Ishita seed

---

## What was done

1. **Dropped all legacy Neon objects** — all public tables and enums removed via `pnpm db:reset`
2. **Applied Phase 0 schema** — `drizzle-kit push --force` on clean database (no interactive enum prompts)
3. **Seeded Ishita hierarchy** — `pnpm db:seed`

One-command refresh for future use:

```bash
pnpm db:fresh   # db:reset + db:seed
```

---

## Hierarchy seeded

| Level | Code | Name |
|-------|------|------|
| Platform | SCHOOLOS | SchoolOS |
| Society | IAS | Ishita Academy Society |
| School | IS | Ishita School |
| Branch (main) | ISGC | Gurudham Colony |
| Branch | ISSG | Seer Goverdhanpur |
| Session | 2026-27 | Academic Session 2026-27 (both branches, `isCurrent: true`) |

---

## Seed counts

| Entity | Count | Expected |
|--------|------:|----------|
| Roles | 9 | 9 system roles |
| Permissions | 15 | RBAC matrix |
| Users | 144 | Admins + staff + teachers + parents |
| Branches | 2 | ISGC, ISSG |
| Sessions | 2 | 2026-27 per branch |
| Classes | 22 | 11 per branch (Nursery → Class 8 incl. LKG/UKG) |
| Sections | 22 | Section A per class |
| Students | 110 | 5 per class × 11 classes × 2 branches |
| Parents | 110 | 1 primary parent per student |
| Attendance records | 30 | 15 sample per branch |
| Fee records | 30 | 15 sample per branch |
| Announcements | 20 | 10 per branch |
| Audit logs | 20 | 10 per branch |

---

## Test credentials (OTP: `123456`)

Dev API accepts OTP **`123456`** for all users (`artifacts/api-server/src/routes/auth.ts`).

| Role | Name | Mobile | Branch |
|------|------|--------|--------|
| Super Admin | Tushar Saraswat | `8707488250` | — |
| Society Admin | Rajesh Saraswat | `9151119959` | — |
| Principal | Seema Bajaj | `8701000001` | ISGC |
| Principal | Geeta Yadav | `8701000002` | ISSG |

**Login flow:**

```http
POST /api/auth/otp/request   { "mobile": "8707488250" }
POST /api/auth/otp/verify    { "mobile": "8707488250", "otp": "123456" }
GET  /api/auth/me            Authorization: Bearer token-{userId}
```

---

## Build & dev status

| Check | Status |
|-------|--------|
| `pnpm db:reset` | ✅ Public schema cleared + Phase 0 push |
| `pnpm db:seed` | ✅ Ishita data loaded |
| `pnpm db:fresh` | ✅ Combined reset + seed |
| `pnpm build` | ✅ Green (Stage 3) |
| `pnpm dev` | Run locally: API `:5000`, web `:5173` |

---

## Known issues

1. **`pnpm db:push` on legacy DB** — interactive enum rename prompts; use `pnpm db:reset` or `pnpm db:fresh` instead for clean cutover.
2. **Frontend still uses legacy-compat hooks** — defaults `branchId=1`, `sessionId=1` (ISGC / 2026-27). Stage 4 will wire real branch/session selector.
3. **OTP is dev-stub only** — production needs SMS provider + session cookies.
4. **`db:reset` is destructive** — drops all public tables/types; dev/staging only.

---

## Scripts added

| Command | Action |
|---------|--------|
| `pnpm db:reset` | Drop all public objects + push Phase 0 schema |
| `pnpm db:seed` | Run Ishita foundation seed |
| `pnpm db:fresh` | Reset + seed in one step |
