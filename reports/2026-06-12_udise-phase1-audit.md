# UDISE+ 2025-26 Phase-1 — Compliance Audit & Gap Analysis

**Date:** 2026-06-12  
**System:** SchoolOS (Phase 0 foundation)  
**Audit scope:** Database schema, API routes, OpenAPI, admin UI  
**Method:** Full inventory → UDISE field mapping → gap classification → implementation plan

---

## 1. Audit Report

### 1.1 Existing (by module)

#### Module 1 — School Profile

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| School Name | `schools.name` | ✅ Present |
| UDISE Code | — | ❌ Missing |
| School Category | — | ❌ Missing |
| School Type | — | ❌ Missing |
| Management Type / Code | — | ❌ Missing |
| School Address | — | ❌ Missing (OpenAPI only) |
| District / Block / Village / Pincode | — | ❌ Missing |
| Latitude / Longitude | — | ❌ Missing |
| Mobile / Email / Website | — | ❌ Missing (OpenAPI partial) |
| Principal Name / Mobile / Email | — | ❌ Missing (OpenAPI `principalName` only) |
| Academic Session Start/End | `academic_sessions.startsOn` / `endsOn` | ✅ Present (per branch session) |
| Year of Establishment | — | ❌ Missing |
| Recognition Status | — | ❌ Missing |
| Affiliation Board / Name / Number | — | ❌ Missing |
| Medium of Instruction | — | ❌ Missing |
| Language Groups | — | ❌ Missing |
| Minority / Residential / Pre-Primary flags | — | ❌ Missing |
| Lowest / Highest Class | — | ❌ Missing |
| Streams (Science/Commerce/Arts/Vocational) | — | ❌ Missing |

**Also exists (internal, not UDISE):** `schools.code`, `schools.status`, `branches.*`, `societies.*`

#### Module 2 — Academic Structure

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Academic Session | `academic_sessions` | ✅ Present |
| Class Master | `classes` (code, name, gradeOrder) | ✅ Partial |
| PrePrimary (Nursery/LKG/UKG) | Seeded as class names | ✅ Partial (no type flag) |
| Class 1–12 | Seeded as class names | ✅ Partial |
| Streams | — | ❌ Missing |
| Sections | `sections` | ✅ Present |
| Subjects | — | ❌ Missing |
| Subject Mapping | — | ❌ Missing |
| Class Teacher Mapping | `classes.classTeacherUserId` | ✅ Partial |

#### Module 3 — Student Master

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Admission Number | `students.admissionNumber` | ✅ Present |
| Roll Number | `students.rollNumber` | ✅ Present |
| Student Name | `firstName`, `middleName`, `lastName` | ✅ Present |
| Gender | `students.gender` | ✅ Present |
| Date of Birth | `students.dob` | ✅ Present |
| Father / Mother Name | `fatherName`, `motherName` | ✅ Present |
| Guardian Name | — | ❌ Missing |
| Mobile Number | `parentMobile` | ✅ Present (parent) |
| Address | `students.address` | ✅ Present |
| Category (SC/ST/OBC) | OpenAPI `category` only | ❌ Missing in DB |
| Religion | — | ❌ Missing |
| Aadhaar | — | ❌ Missing |
| Class / Section | `classId`, `sectionId` | ✅ Present |
| Admission Date | — | ❌ Missing |
| Current Status | `students.status` | ✅ Present |
| Transport Assigned | — | ❌ Missing |
| Health Record Link | — | ❌ Missing |
| Attendance Tracking | `attendance_records` | ✅ Present |

#### Module 4 — Staff Master

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Employee ID | — | ❌ Missing |
| Name | `users.name` | ✅ Present |
| Mobile | `users.mobile` | ✅ Present |
| Email | `users.metadata.email` | ⚠️ JSONB only |
| Gender / DOB | — | ❌ Missing |
| Joining Date | `users.metadata.joinDate` | ⚠️ JSONB only |
| Designation | `roles.name` (approx) | ⚠️ Partial |
| Staff Type (Teaching/Non-teaching) | — | ❌ Missing |
| Qualification / Prof. Qualification | — | ❌ Missing |
| Subjects Taught | `metadata.subject` (single string) | ⚠️ Partial |
| Appointment Type | — | ❌ Missing |
| Attendance | — | ❌ Missing (staff) |
| Salary Reference | `metadata.salary` | ⚠️ JSONB only |
| Status | `users.status` | ✅ Present |

#### Module 5 — Attendance

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Student Daily Attendance | `attendance_records` | ✅ Present |
| Monthly Attendance Summary | — | ❌ Missing |
| Teacher Attendance | — | ❌ Missing |
| Attendance Reports | `/attendance/summary` (today only) | ⚠️ Partial |

#### Module 6 — Examination

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Exam Types | — | ❌ Missing |
| Marks Entry | — | ❌ Missing |
| Grade Entry | — | ❌ Missing |
| Report Cards | — | ❌ Missing |
| Result Generation | — | ❌ Missing |
| Term Exams | — | ❌ Missing |
| Assessment Tracking | — | ❌ Missing |

#### Module 7 — Fees

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| Fee Structure | — | ❌ Missing |
| Fee Heads | `fee_records.feeType` (free text) | ⚠️ Partial |
| Invoices | `fee_records` | ✅ Partial |
| Payments | `POST .../fees/{id}/pay` | ✅ Present |
| Outstanding Dues | `/fees/summary` | ✅ Present |
| Receipt Generation | `receiptNumber` on payment | ✅ Partial |

#### Module 8 — UDISE Core Data

| UDISE field | Existing location | Status |
|-------------|-------------------|--------|
| UDISE Snapshot | — | ❌ Missing |
| Annual profile/enrollment/staff snapshots | — | ❌ Missing |
| Export Ready Status | — | ❌ Missing |
| Compliance Percentage | — | ❌ Missing |

---

### 1.2 Missing (summary count)

| Module | Required items | Present | Missing |
|--------|---------------:|--------:|--------:|
| School Profile | 28 | 3 | 25 |
| Academic Structure | 12 | 5 | 7 |
| Student Master | 18 | 12 | 6 |
| Staff Master | 15 | 4 | 11 |
| Attendance | 4 | 1 | 3 |
| Examination | 7 | 0 | 7 |
| Fees | 6 | 3 | 3 |
| UDISE Core | 6 | 0 | 6 |
| **Total** | **96** | **28** | **68** |

---

### 1.3 Duplicate / name mismatches

| UDISE / UI name | Actual storage | Recommendation |
|-----------------|----------------|----------------|
| `dateOfBirth` | `students.dob` | Keep `dob` in DB; map in API ✅ |
| `parentPhone` | `students.parentMobile` | Keep; map in API ✅ |
| `grade` | `classes.gradeOrder` | Keep; map in API ✅ |
| `classTeacherId` | `classes.classTeacherUserId` | Keep; map in API ✅ |
| `School.address/city/state/phone/email/principalName` | OpenAPI only, not in DB | **Do not duplicate** — implement via `school_profiles` |
| `Student.category` | OpenAPI only | Add `students.socialCategory` column |
| Staff `email/subject/salary/joinDate` | `users.metadata` JSONB | Migrate to `staff_profiles` typed columns |
| `feeType` free text | `fee_records.feeType` | Link to new `fee_heads` master |
| `schools.code` | Internal code | **Not** UDISE code — add separate `udiseCode` |

---

### 1.4 Recommendations

1. **School profile:** New `school_profiles` table (1:1 with `schools`) — avoids bloating core org table and OpenAPI ghost fields.
2. **Staff profile:** New `staff_profiles` table (1:1 with `users` where role is staff) — replace untyped metadata for UDISE fields.
3. **Student UDISE fields:** Add columns to `students` (no duplicate table).
4. **Academic session dates:** Reuse `academic_sessions.startsOn/endsOn`; expose on school profile API as read-through.
5. **Subjects:** New `subjects`, `class_subjects`, `teacher_subjects` tables.
6. **Examinations:** New `exam_types`, `exams`, `exam_results` tables.
7. **Fee heads/structure:** New `fee_heads`, `fee_structures`; keep `fee_records` as invoices.
8. **UDISE module:** New `udise_snapshots` with JSONB section payloads + compliance score.
9. **OpenAPI:** Align spec to DB — remove unimplemented School/Student fields or wire them post-migration.

---

## 2. Gap Analysis (priority)

| Priority | Gap | Risk if omitted |
|----------|-----|-----------------|
| P0 | School UDISE profile | Cannot file UDISE school identification |
| P0 | Student category/religion/admission date | Enrollment return incomplete |
| P0 | Staff qualifications/appointment type | Teacher data return incomplete |
| P0 | UDISE snapshot module | No compliance tracking or export |
| P1 | Subjects + mappings | Academic structure incomplete |
| P1 | Examination module | Result/assessment data missing |
| P1 | Fee heads/structure | Fee master not normalized |
| P2 | Monthly attendance / teacher attendance | Reporting gaps |
| P2 | Health record link | Optional UDISE field |

---

## 3. Migration Plan

### Phase A — Schema (drizzle-kit push)

1. Add UDISE enums to `enums.ts`
2. Create `school_profiles`, `staff_profiles`, `subjects`, `class_subjects`, `teacher_subjects`
3. Create `exam_types`, `exams`, `exam_results`
4. Create `fee_heads`, `fee_structures`
5. Create `staff_attendance_records`, `attendance_monthly_summaries`
6. Create `student_health_records`, `udise_snapshots`
7. Alter `students` — add UDISE columns
8. Update `relations.ts`, `insert-schemas.ts`

### Phase B — API

1. `GET/PATCH /schools/{id}/profile`
2. Extend student/staff CRUD bodies
3. Subject CRUD + mappings
4. Examination CRUD + marks entry
5. Fee heads/structures CRUD
6. Staff attendance + monthly summary endpoints
7. UDISE snapshot CRUD + compliance calculation + export stub

### Phase C — OpenAPI + codegen

Regenerate `@workspace/api-zod` and `@workspace/api-client-react`.

### Phase D — UI

1. School Settings page (UDISE profile form)
2. Extend student create/edit forms
3. Extend staff form
4. Subjects admin page
5. Examinations page
6. Fee structure admin
7. UDISE Snapshot dashboard

---

## 4. Database Changes (planned)

See implementation in `lib/db/src/schema/`:

| Table | Action |
|-------|--------|
| `school_profiles` | **CREATE** — all Module 1 UDISE fields |
| `staff_profiles` | **CREATE** — Module 4 typed staff fields |
| `students` | **ALTER** — +guardianName, socialCategory, religion, aadhaar, admissionDate, transportAssigned, healthRecordId |
| `subjects` | **CREATE** |
| `class_subjects` | **CREATE** |
| `teacher_subjects` | **CREATE** |
| `exam_types` | **CREATE** |
| `exams` | **CREATE** |
| `exam_results` | **CREATE** |
| `fee_heads` | **CREATE** |
| `fee_structures` | **CREATE** |
| `staff_attendance_records` | **CREATE** |
| `attendance_monthly_summaries` | **CREATE** |
| `student_health_records` | **CREATE** |
| `udise_snapshots` | **CREATE** |

No duplicate columns for OpenAPI ghost fields — consolidated into `school_profiles`.

---

## 5. API Changes (planned)

| Method | Path | Purpose |
|--------|------|---------|
| GET/PATCH | `/schools/{schoolId}/profile` | School UDISE profile |
| GET/POST/PATCH | `/branches/{branchId}/sessions/{sessionId}/subjects` | Subject master |
| GET/POST/DELETE | `/.../classes/{classId}/subjects` | Class-subject map |
| GET/POST/DELETE | `/branches/{branchId}/users/{userId}/subjects` | Teacher-subject map |
| GET/POST | `/branches/{branchId}/sessions/{sessionId}/exam-types` | Exam types |
| GET/POST | `/.../exams` | Exam schedules |
| GET/POST/PATCH | `/.../exams/{examId}/results` | Marks/grades |
| GET/POST | `/branches/{branchId}/fee-heads` | Fee head master |
| GET/POST | `/.../fee-structures` | Class fee structure |
| GET/POST | `/branches/{branchId}/staff-attendance` | Teacher attendance |
| GET | `/branches/{branchId}/attendance/monthly` | Monthly summary |
| GET/POST/PATCH | `/schools/{schoolId}/udise-snapshots` | UDISE snapshots |
| GET | `/schools/{schoolId}/udise-snapshots/{id}/export` | Export JSON |

Student/staff routes extended with new fields (no new endpoints required).

---

## 6. UI Changes (planned)

| Page | Action |
|------|--------|
| `/school-settings` | **NEW** — UDISE school profile form |
| `/students/new`, `/students/:id/edit` | **EXTEND** — category, religion, guardian, admission date, transport |
| `/staff` | **EXTEND** — employee ID, qualifications, appointment type |
| `/subjects` | **NEW** — subject master + class mapping |
| `/examinations` | **NEW** — exam types, marks entry |
| `/fees/structure` | **NEW** — fee heads + class structure |
| `/udise` | **NEW** — snapshot list, compliance %, export |
| Sidebar | Add links for new pages |

---

## Approval status

This report is **approval-ready**. Implementation proceeds in the same release branch per task instructions.

**Remaining Phase-2 (out of scope):** UDISE+ portal API sync, infrastructure/facility block, RTE/BPL/disability detailed codes, APAAR/PEN integration, certified export formats (XML/CSV UDISE templates), multi-language UI, production OTP.

---

## 7. Implementation Summary (2026-06-12)

### Database changes applied

New schema files under `lib/db/src/schema/`:

| File | Tables |
|------|--------|
| `school-profiles.ts` | `school_profiles` |
| `staff-profiles.ts` | `staff_profiles` |
| `student-health.ts` | `student_health_records` |
| `subjects.ts` | `subjects`, `class_subjects`, `teacher_subjects` |
| `examinations.ts` | `exam_types`, `exams`, `exam_results` |
| `fee-structures.ts` | `fee_heads`, `fee_structures` |
| `staff-attendance.ts` | `staff_attendance_records` |
| `attendance-summaries.ts` | `attendance_monthly_summaries` |
| `udise-snapshots.ts` | `udise_snapshots` |

Altered: `students` (+7 UDISE columns), `enums.ts` (+8 UDISE enums)

**Apply:** `pnpm db:push`

### New API routes

| Route file | Endpoints |
|------------|-----------|
| `school-profiles.ts` | `GET/PATCH /schools/:schoolId/profile` |
| `subjects.ts` | Subject CRUD + class/teacher mapping |
| `examinations.ts` | Exam types, exams, results |
| `fee-structures.ts` | Fee heads + structures |
| `staff-attendance.ts` | Staff attendance + monthly summary |
| `udise.ts` | Snapshots + JSON export |

Extended: `students.ts`, `users.ts` (staff profile)

Validation: `artifacts/api-server/src/lib/udise-schemas.ts`

### New UI pages

| Route | Page |
|-------|------|
| `/school-settings` | UDISE school profile form |
| `/subjects` | Subject master |
| `/examinations` | Exam types & schedules |
| `/fee-structure` | Fee heads & class structure |
| `/udise` | Snapshot + compliance + export |

Extended: `student-form.tsx` (category, religion, guardian, address, transport, admission date)

### Files changed (high level)

- `lib/db/src/schema/*` — 9 new files, 2 altered
- `artifacts/api-server/src/routes/*` — 6 new route modules, 3 updated
- `artifacts/api-server/src/lib/udise-schemas.ts` — new
- `artifacts/school-os/src/pages/*` — 5 new pages, 2 updated
- `artifacts/school-os/src/App.tsx`, `layout.tsx` — nav + routes
- `artifacts/api-server/package.json` — added `zod`

### Remaining Phase-2 items

- UDISE+ official CSV/XML export templates
- Infrastructure & facility UDISE block
- APAAR / PEN student IDs
- Disability / BPL / RTE detailed codes
- OpenAPI regeneration for new endpoints (currently validated via `udise-schemas.ts`)
- Student edit page, staff profile form UI
- Monthly attendance auto-aggregation job
- Report card PDF generation
- UDISE portal sync API

