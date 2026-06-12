# Billing MVP-A — Preflight Review (Indian School Scenarios)

> **Status:** Patches below merged into [BILLING_MVP_IMPLEMENTATION_PLAN.md](./BILLING_MVP_IMPLEMENTATION_PLAN.md) (rev. 2)  
> **Purpose:** Identify real-world scenarios that would **break** MVP-A on first school deployment, and the **smallest possible fixes** to apply **before coding starts**.  
> **Rule:** No Phase B features. Only patches that prevent production failure.  
> **Date:** June 12, 2026

---

## Executive Summary

MVP-A is **not safe to implement as written** for a typical Indian private school. **6 of 10** scenarios will cause wrong charges, stuck money, or clerk rebellion on day one.

### Verdict at a glance

| # | Scenario | MVP-A as planned | Must patch pre-code? |
|---|----------|------------------|----------------------|
| 1 | Mid-month admission | **Unsafe** | Yes |
| 2 | Transport on/off mid-month | **Unsafe** | Yes |
| 3 | Student leaves mid-session | **Unsafe** | Yes |
| 4 | Class change mid-session | **Partial** | Yes (small) |
| 5 | Fee revision from future date | **Broken** | Yes (schema) |
| 6 | Siblings pay together | **Partial** | Yes (UI/API) |
| 7 | Advance payments | **Unsafe** | Yes |
| 8 | Receipt cancellation | **Unsafe** | Yes |
| 9 | Wrong payment entry | **Unsafe** | Yes |
| 10 | Session rollover | **Partial** | Yes (small) |

### Mandatory pre-code patch list (8 items)

Apply these to the implementation plan **before Sprint 1 schema freeze**:

| Patch | Effort | Blocks |
|-------|--------|--------|
| P1 — Fix `fee_structures` unique index for dated revisions | 2 hours | Fee hike |
| P2 — Admission date gate + optional proration in invoice generator | 1 sprint day | Mid-month admission |
| P3 — Respect `student_fee_assignments.effective_from/to` in generator | 1 sprint day | Transport on/off |
| P4 — Bill only `status = active`; cancel unpaid future invoices | 2 sprint days | TC / leave |
| P5 — Advance credit on overpayment + apply on next collection | 3 sprint days | Advance pay |
| P6 — Payment void (reverses receipt + allocations + ledger) | 3 sprint days | Wrong entry / receipt cancel |
| P7 — Single-student generate + parent-mobile multi-child collect | 2 sprint days | Admission + siblings |
| P8 — Prior-session collection + clone fee structures | 2 sprint days | Session rollover |

**Net add to MVP-A:** ~2 weeks spread across S2–S4 (not Phase B). Still no rule engine, no refunds workflow, no family wallet.

---

## Scenario Reviews

---

### 1. Mid-month admissions

**Real school behaviour:** Student admitted 18 July. School either charges July pro-rata (13 days) or skips July and starts August. April bulk run already happened — clerk expects system to bill this student without re-running whole school.

#### Is MVP-A safe?

**No.**

| Gap | What breaks |
|-----|-------------|
| No proration logic in `invoice-generator.ts` | Full month fee charged if admitted on 31st |
| No admission-date filter | Student could get billed for months before admission if bulk run is re-run incorrectly |
| No single-student generate API | Plan only has bulk `billing-runs`; clerk waits for next bulk run (acceptable only if idempotent re-run picks up missing students — **partially OK**) |
| `students.admission_date` exists but plan never references it | Field unused |

**What works without changes:** Idempotency key per student+period means re-running bulk generation **will** create invoices for newly admitted students who don't have July yet. So billing timing is OK if accounts re-runs or uses single-student generate.

**What still breaks:** Amount is always full class fee with no pro-rata.

#### Smallest fix (before coding)

1. **`invoice-generator` rule:** Skip any billing period where `billing_period_end < student.admission_date` (month entirely before admission).

2. **`invoice-generator` rule:** For the admission month only, if `admission_date > billing_period_start`, apply proration:
   ```
   prorated = round(full_amount × (days_remaining_in_month / days_in_month))
   ```
   Days = calendar days (document in runbook). Round to nearest rupee.

3. **Add column on `academic_sessions`:**
   | Column | Type | Default |
   |--------|------|---------|
   | `prorate_mid_month_admission` | boolean | `true` |

   When `false`, skip the admission month entirely (bill from next month).

4. **Add API (1 endpoint):**
   ```
   POST /branches/:branchId/sessions/:sessionId/students/:studentId/invoices/generate
   Body: { billingPeriodStart, billingPeriodEnd, billingPeriodLabel }
   ```
   Same logic as bulk run for one student. Clerk/admission desk uses this on admission day.

**Do NOT add:** event billing, admission fee automation, enrollment history table.

---

### 2. Mid-month transport activation / deactivation

**Real school behaviour:** Transport starts 10 September (₹800/month). Student stops transport from 1 December. No route/stop tables in MVP — flat transport fee head per class.

#### Is MVP-A safe?

**No** (as planned).

| Gap | What breaks |
|-----|-------------|
| `student_fee_assignments` has `effective_from/to` but plan doesn't require generator to honour them | Transport billed every month from class structure |
| `students.transport_assigned` boolean not wired to billing | Flag ignored |
| No pro-rata on transport activation month | Full ₹800 if activated on 28th |
| Deactivation: no credit for December if already invoiced | Acceptable — manual adjustment; future months must stop |

#### Smallest fix (before coding)

1. **Invoice generator inclusion rule for each fee head:**
   - Resolve class structure amount.
   - If `student_fee_assignment` exists for this head: honour `is_excluded`, `override_amount`, **`effective_from`**, **`effective_to`** against `billing_period_end`.
   - If no assignment for transport head but `students.transport_assigned = false`, **exclude transport head** (wire existing column).

2. **On transport activation** (accounts UI, not event engine): create/update assignment:
   ```
   fee_head = Transport, effective_from = activation date, is_excluded = false
   ```

3. **On deactivation:** set `effective_to = last day of previous month` on assignment + `transport_assigned = false`.

4. **Reuse admission proration** for transport line in activation month (same helper function).

**Do NOT add:** `transport_routes`, service model, event `TRANSPORT_ACTIVATED`.

---

### 3. Student leaving school mid-session (TC / transfer)

**Real school behaviour:** Student takes TC in November. Stop December fees. Collect pending dues. Clearance certificate when balance = 0. Sometimes refund small advance — rare, often handled offline in MVP.

#### Is MVP-A safe?

**No.**

| Gap | What breaks |
|-----|-------------|
| Plan excludes invoice cancel API | December invoice still generated if student still `active` |
| Bulk run doesn't document `status` filter | Transferred student may get billed |
| `student_status` includes `transferred`, `graduated`, `inactive` — not used in billing | TC student billed next month |
| No refund workflow | Advance at TC — accounts handles offline (acceptable for MVP if advance is tracked) |

#### Smallest fix (before coding)

1. **Invoice generator:** Include only students where `status = 'active'`.

2. **Add minimal invoice cancel** (removed from "NOT in MVP" list — required for production):
   ```
   POST /branches/:branchId/sessions/:sessionId/invoices/:invoiceId/cancel
   Body: { reason: string }
   ```
   - Allowed only if `total_paid = 0` (unpaid invoice).
   - Sets `status = cancelled`.
   - Posts void `charge` ledger entries (`is_void = true` on original charges OR reversal entries with `reference_entry_id`).
   - Audit log required.

3. **Student status change hook** (app layer, not event engine): when `status` → `transferred` | `inactive` | `graduated`:
   - Auto-cancel all unpaid invoices with `due_date > today`.
   - Do **not** touch paid or partially paid invoices (outstanding remains collectible).

4. **Outstanding report:** include transferred students with open dues (filter toggle "Include TC students").

**Do NOT add:** refund workflow, TC fee automation, clearance certificate PDF.

---

### 4. Student changing class mid-session

**Real school behaviour:** Promoted Class 5 → Class 6 in May (or mid-May). May fee should reflect new class from promotion date or from 1 May if promotion is always on 1st.

#### Is MVP-A safe?

**Partially** — only if promotion always happens **before** monthly generation on the 1st.

| Gap | What breaks |
|-----|-------------|
| Generator uses `students.class_id` at generation time | OK for month-boundary promotion |
| No `class_effective_from` | Mid-month promotion: wrong fee for that month |
| No enrollment history | Can't prove old class for disputes |
| Already-issued April invoice unchanged | Correct behaviour |

#### Smallest fix (before coding)

1. **Add 2 columns on `students`** (not a new table):
   | Column | Type | Notes |
   |--------|------|-------|
   | `billing_class_id` | integer FK nullable | If null, use `class_id` |
   | `billing_class_effective_from` | date nullable | Fee structure uses `billing_class_id` when `billing_period_start >= billing_class_effective_from` |

2. **Class change UI:** when admin updates class, show: *"Apply new fee from date"* → sets `billing_class_id` + `billing_class_effective_from`. Updates `class_id` for academic records immediately.

3. **Proration (optional MVP):** if promotion mid-month and fee increases, **do not** auto-adjust current month invoice — runbook: accounts cancels unpaid invoice and regenerates single-student (depends on Patch P4/P7). Simpler than delta billing.

**Do NOT add:** enrollment history table, promotion event billing.

---

### 5. Fee revision from a future date

**Real school behaviour:** Tuition ₹3,000 until July. From 1 August ₹3,300. Fee committee approval letter dated June.

#### Is MVP-A safe?

**No — schema is broken today.**

| Gap | What breaks |
|-----|-------------|
| Unique index `fee_structures_class_head_uq` on `(session_id, class_id, fee_head_id)` | **Cannot insert** August row while July row exists |
| Plan adds `effective_to` but doesn't fix unique constraint | Migration fails or overwrites |
| `pricing-resolver` must pick row where billing period overlaps `[effective_from, effective_to]` | Not specified |

#### Smallest fix (before coding) — **BLOCK Sprint 1 until done**

1. **Replace unique index in M3 migration:**
   ```sql
   DROP INDEX fee_structures_class_head_uq;
   CREATE UNIQUE INDEX fee_structures_class_head_effective_uq
     ON fee_structures (session_id, class_id, fee_head_id, effective_from);
   ```
   `effective_from` NOT NULL — backfill existing rows with session `starts_on`.

2. **`pricing-resolver` rule:**
   ```
   Select fee_structure WHERE class_id = billing_class
     AND fee_head_id = head
     AND effective_from <= billing_period_end
     AND (effective_to IS NULL OR effective_to >= billing_period_start)
   Order by effective_from DESC LIMIT 1
   ```

3. **Fee structure UI:** allow multiple rows per class+head with different effective dates (show timeline, not just matrix overwrite).

**Do NOT add:** fee committee approval workflow, version diff UI.

---

### 6. Multiple siblings paying together

**Real school behaviour:** Parent comes with ₹15,000 cash for 3 children. Clerk enters once, prints 3 receipts (or one combined — school-specific). Daily register must tie to one cash handover.

#### Is MVP-A safe?

**Partially** — mathematically OK if clerk enters 3 payments; **operationally unsafe**.

| Gap | What breaks |
|-----|-------------|
| One payment = one student | Clerk enters wrong split; 3× data entry errors |
| Search by parent mobile returns one student | Plan mentions search but not multi-child |
| Daily collection report | Can't group sibling transaction |

#### Smallest fix (before coding)

1. **Extend student search API:**
   ```
   GET .../students/search?q=...&groupByParent=true
   ```
   Search by parent mobile returns **all active siblings** in branch+session with outstanding per child.

2. **Add batch collect endpoint** (not a family wallet):
   ```
   POST .../payments/batch
   Body: {
     paymentDate, paymentMethod, transactionRef,
     counterBatchId?: uuid,  // optional, auto-generated
     lines: [{ studentId, amount, notes? }]
   }
   ```
   - One DB transaction: N payments, N receipts, N allocation passes.
   - All payments share `counter_batch_id` (new nullable column on `payments`).
   - Returns array of receipt IDs for sequential print.

3. **Counter UI:** after mobile search, show all children with checkboxes + amount per child + single "Collect total" button.

**Do NOT add:** `family_accounts`, single combined receipt, shared ledger wallet.

---

### 7. Advance payments

**Real school behaviour:** Parent pays April + May + June in April (₹10,500). Or pays ₹12,000 when dues are ₹8,000. Clerk must see advance next month. Very common.

#### Is MVP-A safe?

**No.**

| Gap | What breaks |
|-----|-------------|
| Plan explicitly excludes advance credit API | Excess ₹4,000 has nowhere to go |
| Allocation algorithm allocates to open invoices only | Remainder rejected or lost |
| No `advance` ledger entry type | Balance wrong |
| DoD says "only new payment corrects" but no void either | Stuck |

#### Smallest fix (before coding)

1. **Extend `ledger_entry_type` enum:** add `advance` (credit) — still MVP, one enum value.

2. **Payment POST behaviour:** if `amount > total_outstanding`:
   - Allocate fully to open invoices.
   - Post remaining as `advance` credit ledger entry linked to `payment_id`.
   - Store `payments.unallocated_amount` for fast lookup.

3. **Outstanding API response** add:
   ```json
   { "outstanding": 5000, "advanceCredit": 4000, "invoices": [...] }
   ```

4. **Collection UI:** show "Advance available: ₹4,000". Payment form:
   - `cashReceived` + checkbox `applyAdvanceUpTo` (default min(outstanding, advance))
   - Net cash = outstanding − advance applied

5. **Minimal apply-advance logic inside payment POST** (no separate workflow):
   ```
   if applyAdvanceAmount > 0:
     create allocation from prior advance payments (FIFO by payment_date)
     post ledger debits against advance (entry_type = advance, direction = debit)
   ```

**Do NOT add:** auto-apply on invoice generation, installment plans, advance refund workflow.

---

### 8. Receipt cancellation

**Real school behaviour:** Wrong receipt printed, cheque bounced, duplicate entry. School marks receipt cancelled in register; system must undo ledger impact.

#### Is MVP-A safe?

**No** — explicitly excluded from MVP-A APIs.

| Gap | What breaks |
|-----|-------------|
| Receipt immutable, no void | Paper cancelled, system shows paid |
| No payment reverse | Invoice stays paid, ledger wrong |
| Cheque bounce deferred to 6 months | Will happen in week 2 |

#### Smallest fix (before coding)

Same as **Scenario 9** — single **payment void** flow covers receipt cancellation:

1. **Add columns:**
   | Table | Column |
   |-------|--------|
   | `payments` | `is_void`, `voided_at`, `voided_by`, `void_reason` |
   | `receipts` | `is_void`, `void_reason` |

2. **API:**
   ```
   POST .../payments/:paymentId/void
   Body: { reason: string }   // fees.manage only, not clerk
   ```

3. **Void transaction:**
   - Set payment + receipt `is_void = true`.
   - Void all `payment_allocations` (soft: `is_void` column OR delete with audit snapshot in `audit_logs`).
   - Void ledger `payment` credits (`is_void = true`).
   - If advance was created from this payment, void advance entries too.
   - Recompute `invoice.total_paid` + status → `published` / `partially_paid`.
   - Audit log with full before snapshot.

4. **Daily collection report:** exclude voided payments by default; include void section for reconciliation.

**Do NOT add:** cheque lifecycle table, bounce fee automation, approval workflow.

---

### 9. Wrong payment entry

**Real school behaviour:** Clerk enters ₹50,000 instead of ₹5,000. Discovered 10 minutes later. Must undo without DB admin access.

#### Is MVP-A safe?

**No.**

| Gap | What breaks |
|-----|-------------|
| DoD #15: "Payment cannot be edited" | Correct principle, but void path missing |
| No corrective workflow | Accounts calls developer |

#### Smallest fix

**Same as Scenario 8** — `POST .../payments/:paymentId/void`.

**Additional UI rule (no new backend):**
- Void button on payment detail — **accounts/admin only** (`fees.manage`, not `fees.collect`).
- Clerk must call accounts for void within same day (runbook).

**Optional 30-minute window:** not required for MVP if role-gated void exists.

---

### 10. Session rollover

**Real school behaviour:** Session 2025–26 ends March 2026. Session 2026–27 starts April 2026. Old dues still collected at counter in April. New fee structure copied from last year with edits.

#### Is MVP-A safe?

**Partially.**

| Gap | What breaks |
|-----|-------------|
| All billing scoped to `session_id` | Correct |
| `students.session_id` tied to one session | Student promotion to new session is separate module — billing must work per session |
| UI `useScope()` likely current session only | **Cannot collect March dues in April** if session switched |
| No clone fee structures | Accounts re-enters entire matrix manually — error-prone, not a hard break |
| No carry-forward | Old outstanding stays in old session invoices — **OK if collectible** |
| `number_sequences` per session | Resets — correct |

#### Smallest fix (before coding)

1. **Session selector on billing screens** (collect, outstanding, daily collection):
   - Default: `is_current = true` session.
   - Allow switching to prior session for **collection and reports only** (not generation).

2. **Block billing run** on non-current session unless `force: true` query param (admin).

3. **Add clone API:**
   ```
   POST /branches/:branchId/sessions/:newSessionId/fee-structures/clone
   Body: { fromSessionId: number, adjustAmountPercent?: number }
   ```
   Copies fee_heads references + fee_structures rows to new session.

4. **Runbook section:** old session remains open for collection until `status = closed` (manual); no auto year-end.

**Do NOT add:** carry-forward rules, year-end pipeline, locked/archived state machine.

---

## Updated MVP-A Scope Boundaries

Move these **from "NOT in MVP" → "IN MVP"** in the implementation plan:

| Feature | Reason |
|---------|--------|
| `POST invoices/:id/cancel` (unpaid only) | TC / leave school |
| `POST payments/:id/void` | Wrong entry + receipt cancel |
| `POST students/:id/invoices/generate` | Mid-month admission |
| `POST payments/batch` | Siblings at counter |
| Advance credit on overpayment | Very common |
| Fix `fee_structures` unique index | Fee revision |

Keep excluded:

- Refund payout workflow
- Cheque register / bounce fee
- Late fee cron
- Auto-apply advance on invoice generation
- Family wallet
- Event billing

---

## Schema Changes Summary (Pre-Sprint 1)

Add to migration M1–M3:

```text
academic_sessions
  + prorate_mid_month_admission  boolean DEFAULT true

students
  + billing_class_id             integer FK nullable
  + billing_class_effective_from date nullable

fee_structures
  ~ DROP unique (session_id, class_id, fee_head_id)
  + UNIQUE (session_id, class_id, fee_head_id, effective_from)
  + effective_from NOT NULL (backfill session.starts_on)
  + effective_to (already planned)

payments
  + unallocated_amount           integer DEFAULT 0
  + counter_batch_id             text nullable
  + is_void, voided_at, voided_by, void_reason

receipts
  + is_void, void_reason

payment_allocations
  + is_void                        boolean DEFAULT false

ledger_entry_type enum
  + 'advance'

invoices.status
  already has 'cancelled' — wire it up
```

---

## Updated API Count

| Change | Endpoints |
|--------|-----------|
| Original MVP-A | 28 |
| + single-student generate | 1 |
| + payment void | 1 |
| + invoice cancel | 1 |
| + payment batch | 1 |
| + fee-structure clone | 1 |
| **Revised MVP-A total** | **33** |

---

## Updated Definition of Done (add before go-live)

| # | New criterion |
|---|---------------|
| 16 | Student admitted 20 July billed pro-rata (or skipped per setting) — not full month unless admitted 1st |
| 17 | Transport excluded after deactivation effective date |
| 18 | TC student does not receive next month's invoice; unpaid future invoices cancelled |
| 19 | August fee revision uses new amount; July invoice unchanged |
| 20 | Parent mobile search shows 3 siblings; batch collect prints 3 receipts in one action |
| 21 | Overpayment ₹12,000 on ₹8,000 due → ₹4,000 advance shown on next visit |
| 22 | Accounts voids wrong payment; invoice reopens; daily report excludes void |
| 23 | April counter can collect 2025–26 dues after 2026–27 session is current |

---

## Recommended Sprint Re-order

| Sprint | Add to plan |
|--------|-------------|
| **S1** | P1 unique index fix, schema patches (void columns, advance enum, billing_class columns) |
| **S2** | P2 admission gate + proration, P5 fee revision resolver, single-student generate |
| **S3** | P5 advance credit on payment, P7 batch payment API |
| **S4** | P3 transport effective dates, P4 invoice cancel + status filter |
| **S5** | P6 payment void UI, P8 session selector + clone fee structures |
| **S6** | UAT with all 10 scenarios as test cases |

---

## Related Documents

- [BILLING_MVP_SCOPE.md](./BILLING_MVP_SCOPE.md)
- [BILLING_MVP_IMPLEMENTATION_PLAN.md](./BILLING_MVP_IMPLEMENTATION_PLAN.md)

---

*Document generated: June 12, 2026 | Billing MVP-A Preflight Review*
