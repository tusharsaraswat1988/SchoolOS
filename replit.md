# School OS

An AI-Powered Multi-Tenant School Operating System — an enterprise-grade full-stack web app with dashboards for Super Admin, School Admin, Principal, and Teacher roles. Phase 1 covers students, fees, attendance, staff, classes, announcements, and analytics. Designed for Indian schools with a premium Apple/Stripe-inspired UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, wouter routing, TanStack Query, shadcn/ui, Tailwind CSS, zustand

## Where things live

- `lib/db/src/schema/` — 9 schema files: schools, users, classes, students, staff, attendance, fees, announcements, activity
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (single file, `mode: "single"`)
- `artifacts/api-server/src/routes/` — Express routes: auth, schools, students, staff, classes, attendance, fees, announcements, dashboard
- `artifacts/school-os/src/pages/` — React pages for all routes
- `artifacts/school-os/src/lib/auth.ts` — Zustand auth store with localStorage persistence

## Architecture decisions

- Multi-tenant by schoolId — every resource is scoped to a school
- Auth is simulated for demo: role picker on login → zustand store persisted to localStorage
- API routes follow RESTful conventions: `/api/schools/:schoolId/<resource>`
- Dashboard and activity feed routes are at `/api/schools/:schoolId/dashboard` and `/api/schools/:schoolId/dashboard/activity`
- Fee status computed on the fly: paid when paidAmount >= amount - discount
- Orval zod config: `workspace: apiZodGenerated`, `mode: "single"`, `target: "api"` — do NOT revert to schemas option

## Product

- Login page with role selector (Super Admin, School Admin, Principal, Teacher)
- Dashboard with KPI cards (students, staff, attendance %, fee collection %)
- Students list with search, add/delete, status badges
- Add Student form with class selection and parent info
- Staff list with role-based color coding and add modal
- Classes grid with capacity fill meter
- Attendance page: class + date selector, per-student status (present/absent/late/excused)
- Fee management with summary cards and payment recording dialog
- Announcements with priority/audience badges and create/delete
- Activity feed with timeline UI
- Schools page (super admin only) with plan badges and stats

## User preferences

- Target Indian schools (show Indian rupee ₹, Indian phone formats)
- No emojis in the UI
- Premium Apple-inspired design language

## Gotchas

- Always restart the API server workflow after route changes (it builds then starts)
- The `lib/api-zod/src/index.ts` must stay as `export * from "./generated/api"` — no types re-export
- Do NOT add leaf workspace packages to root `tsconfig.json` references
- Auth is plain-text password comparison for demo (passwordHash stores plain password)
- Default demo school ID is 1 (Delhi Public School), pre-seeded with 15 students, 8 staff, 10 classes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
