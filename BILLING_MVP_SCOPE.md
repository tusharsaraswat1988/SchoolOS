# SchoolOS Billing — Brutally Realistic MVP Scope

> **Purpose:** Operational review of the Phase A billing roadmap from the perspective of people who actually run an Indian private school — not from software architecture.  
> **Audience:** Product, engineering, school onboarding, leadership.  
> **Date:** June 12, 2026

---

## Executive Summary

Phase A as originally scoped is **~40% larger than what a school will actually go live with**. A typical CBSE/ICSE private school (500–2,000 students, counter collection) needs **~8 screens and ~12–15 tables**, not 14 screens and 25 tables.

**First production is not full Phase A.** It is roughly **60% of Phase A**, using school-friendly language:

| Say to the school | Don't say to the school |
|-------------------|-------------------------|
| Fee structure | Pricing matrix |
| Generate fees | Billing run |
| Collect fee | Payment allocation |
| Discount | Concession scheme |

**Build ledger-first internally** (owners and accountants care when money disappears). **Do not expose ledger complexity** to the fee clerk on day one.

---

## Table of Contents

1. [Persona Review](#1-persona-review)
2. [Verdict on Phase A Roadmap](#2-verdict-on-phase-a-roadmap)
3. [Tier 1 — Absolutely Mandatory](#3-tier-1--absolutely-mandatory)
4. [Tier 2 — Can Wait 6 Months](#4-tier-2--can-wait-6-months)
5. [Tier 3 — Can Wait 1 Year](#5-tier-3--can-wait-1-year)
6. [Realistic MVP Scope](#6-realistic-mvp-scope)
7. [Priority Matrix](#7-priority-matrix)
8. [Recommended Implementation Split](#8-recommended-implementation-split)

---

## 1. Persona Review

### 1.1 School Principal

| Cares about | Does not care about |
|-------------|---------------------|
| "Who hasn't paid?" by class | Ledger entries, billing runs, idempotency |
| Total collected today / this month | Pricing matrix JSON, grouping dimensions |
| Legitimate receipt when a parent complains | API design, materialized views |
| No fee fights at TC time — "dues clear?" | Rule engine, event billing |
| Fee structure signed off once a year | Custom fields, org types |

**Go-live question:** *"Can accounts tell me defaulters tomorrow morning?"*

---

### 1.2 Accounts Manager

| Cares about | Does not care about |
|-------------|---------------------|
| Set tuition / transport / lab per class for this session | Hierarchical fee heads (Route + Escort) |
| Generate April fees for all students in one go | Nested AND/OR rules |
| Fix one student's fee (RTE, staff child) | Multi-dimensional grouping engine |
| Daily collection register for bank deposit | Refund approval workflow |
| Match counter total to system at day end | Partitioning, Redis |
| Reprint receipt when parent loses it | Document template engine |
| Mid-year fee hike from August | Year-end carry-forward automation |

**Go-live question:** *"Can I run April billing and reconcile today's cash?"*

---

### 1.3 Fee Collection Clerk

| Cares about | Does not care about |
|-------------|---------------------|
| Find student in **under 5 seconds** (name / admission no / mobile) | Concession scheme taxonomy |
| See **exact amount due today** | Invoice draft vs publish states |
| Take cash / UPI, give receipt **immediately** | Payment allocation strategies |
| Partial payment ("₹2,000 now, rest later") | Advance credit auto-apply |
| Print receipt again | Audit log schema |
| Simple screen, no training manual | Billing run item status |

**Go-live question:** *"Parent is at the window — can I collect and print in 2 minutes?"*

---

### 1.4 School Owner

| Cares about | Does not care about |
|-------------|---------------------|
| Money in = money recorded | V2 architecture vision |
| No duplicate receipts / lost collections | Generic service model |
| Can replace Excel / old software | Custom fields engine |
| Low staff training cost | 22 new tables |
| Won't embarrass school in front of parents | Enterprise scale design |

**Go-live question:** *"Will this lose money or create parent disputes?"*

---

## 2. Verdict on Phase A Roadmap

Phase A bundles **platform foundations** with **school MVP**. Schools do not need both on day one.

| Phase A item | School reality |
|--------------|----------------|
| Ledger-first (immutable) | **Mandatory internally** — clerk only needs a correct balance |
| `pricing_matrix_rules` | **Mandatory** — CLASS-only is enough; call it "fee structure" in UI |
| `student_group_dimensions` + memberships | **Overkill** — a Category dropdown works for 6 months |
| `concession_schemes` table | **Overkill** — "discount on this student" is enough |
| `late_fee_rules` + cron | **Can wait** — accounts adds manually for months |
| `billing_runs` + `billing_run_items` | **Half mandatory** — bulk generate yes; per-student run audit can wait |
| `bank_accounts` + routing | **Can wait** — one school account for year 1 |
| `payment_method_configs` CRUD | **Can wait** — Cash + UPI covers ~90% |
| Invoice DRAFT → PUBLISH workflow | **Can wait** — auto-publish or "generate = live" |
| Waiver / ad-hoc charge APIs | **Can wait 6 months** |
| `student_fee_assignments` | **Mandatory for exceptions** — ~5–10% of students |
| Advance credit auto-apply | **Can wait** — clerk applies manually |
| Payment reverse / reallocate | **Reverse can wait 6 months** |
| Receipt PDF to object storage | **Can wait** — browser print is fine |
| 14 UI screens | **~8 screens** are day-one; rest is go-live bloat |

---

## 3. Tier 1 — Absolutely Mandatory

**Non-negotiable** for the first Indian private school deployment. The school will not go live without these.

### Setup (once per session)

| # | Feature |
|---|---------|
| 1 | **Fee heads** — Tuition, Transport, Lab, Activity, etc. (flat list, no hierarchy) |
| 2 | **Class-wise fee amounts** for current academic session |
| 3 | **Due date rule** — e.g. 10th of month |
| 4 | **Academic session binding** — all fees scoped to 2025–26 |

### Monthly / term operations

| # | Feature |
|---|---------|
| 5 | **Bulk fee generation** — "Generate April fees for all active students" |
| 6 | **Fee demand per student** — owed amount, fee heads, period |
| 7 | **Student search** — admission number, name, parent mobile |
| 8 | **Outstanding balance** — single number the clerk trusts |

### Counter collection

| # | Feature |
|---|---------|
| 9 | **Record payment** — Cash + UPI minimum |
| 10 | **Partial payment** |
| 11 | **Receipt with unique number** — sequential, per school/year |
| 12 | **Receipt reprint** — same data, same number |
| 13 | **One payment → multiple fee heads** |

### Reports (minimum)

| # | Feature |
|---|---------|
| 14 | **Daily collection register** — date, student, amount, mode, collected by |
| 15 | **Outstanding / defaulter list** — by class, amount, days overdue |
| 16 | **Collection summary** — today / month / session totals |

### Exceptions (from week one)

| # | Feature |
|---|---------|
| 17 | **Per-student fee override or discount** — RTE, staff child, sibling (₹ or %) |
| 18 | **Exclude a fee head for one student** — e.g. no transport |

### Data integrity (hidden from clerk)

| # | Feature |
|---|---------|
| 19 | **Payments cannot be silently edited** — wrong amount = correction or audited delete |
| 20 | **Balance = charges − payments − discounts** — always reconciles |

### Access control

| # | Feature |
|---|---------|
| 21 | **Role separation** — clerk collects; admin configures; principal read-only reports |

### Realistic MVP sizing

| Asset | Full Phase A | Realistic MVP |
|-------|--------------|---------------|
| Tables | ~25 | **~12–15** |
| UI screens | ~14 | **~8** |
| Calendar (2 engineers) | 10–14 weeks | **~8 weeks** |

---

## 4. Tier 2 — Can Wait 6 Months

The school will survive with manual workarounds. **Do not block first deployment.**

| Feature | Workaround until then |
|---------|------------------------|
| Late fee automation | Accounts adds late fee manually |
| Cheque register / bounce handling | Paper register; fix in system when bounced |
| Invoice cancel + formal reversal | Void in register; manual note |
| Advance / overpayment tracking | Remarks; adjust next month manually |
| Transport routes & stops | Flat transport fee or manual override |
| Student grouping engine | Category dropdown: General / SC / ST / OBC / RTE |
| Concession schemes (named templates) | Named discount entered per student |
| Sibling auto-discount | Manual discount on each sibling |
| Bank account split | Single bank deposit |
| Payment method admin screen | Hardcode Cash, UPI, Cheque, Online |
| Draft → Publish invoice workflow | Generate = final |
| Ad-hoc / one-time charges | Manual line or spreadsheet |
| Waiver with approval | Paper approval; accounts enters discount |
| Class-wise collection report | Filter outstanding export |
| Fee head-wise collection report | Excel pivot |
| SMS / WhatsApp receipt | Paper receipt |
| Fee revision mid-year (versioning) | New amount from date; old untouched |
| Bulk import payments | Counter entry only |
| Rich student fee assignment UI | Minimal form on student profile |
| Payment reverse | Rare; manual correction |
| Receipt cancel | Paper cancellation register |

**Defer from Phase A to 6-month release:**

- `late_fee_rules`
- `concession_schemes`
- `student_group_*` tables
- `bank_accounts`
- `payment_method_configs`
- Invoice publish / cancel workflow
- Waiver API
- Payment reallocate
- Receipt cancel
- Fee-head-wise reports (beyond basic)

---

## 5. Tier 3 — Can Wait 1 Year

Enterprise, multi-school, and compliance features. **The first school will not miss these.**

| Feature | Why it can wait |
|---------|-----------------|
| Nested rule engine (AND/OR, groups) | Accounts knows the ~10 rules by heart |
| Event billing (admission, promotion, transport activation) | Manual charge at admission desk |
| Installment / EMI plans | Monthly fee or 2–3 manual chunks |
| Refund workflow (TC advance return) | Rare; bank transfer + paper voucher |
| Approval workflows | Principal signs paper |
| Document template engine (thermal / A4 / WhatsApp) | Browser print + letterhead |
| Custom fields (bus route, hostel room) | Excel or student remarks |
| Fee head hierarchy (Transport → Route + Escort) | Single "Transport" head |
| Generalized services model | Flat transport fee |
| Cohorts / batches | Coaching-only; not first school profile |
| Online payment gateway + webhooks | Counter-only for year 1 |
| Parent portal / online pay | Year 2 product |
| GST / tax lines | Many schools defer; accountant handles |
| Credit / debit notes | Tally |
| Year-end lock / carry-forward automation | Manual opening balance |
| Family wallet (one payment, 3 children) | Three receipts — annoying but accepted |
| Multi-branch consolidation | One branch first |
| Audit log UI for fee config | Annual committee audit |
| Billing run per-student error dashboard | Manual retry |
| Dunning / overdue notices | Phone calls from office |
| Tally / ERP sync | Excel export |
| Partitioning, Redis, materialized views | Single-school scale |

---

## 6. Realistic MVP Scope

### 6.1 What to ship for first production

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN (Accounts)          │  CLERK (Counter)           │
├────────────────────────────┼────────────────────────────┤
│  Fee heads (list)          │  Search student            │
│  Class × fee structure     │  View dues (breakdown)     │
│  Generate fees (bulk)      │  Collect payment           │
│  Student discount/override │  Print receipt             │
│  Daily collection report   │  Reprint receipt           │
│  Outstanding report        │                            │
└────────────────────────────┴────────────────────────────┘
         │                              │
         └────────── Ledger core ───────┘
              (invoices + payments + balances)
```

### 6.2 UI screens (8 mandatory)

| # | Screen | User |
|---|--------|------|
| 1 | Fee Heads Manager | Accounts |
| 2 | Fee Structure Builder (class × head) | Accounts |
| 3 | Bulk Fee Generator | Accounts |
| 4 | Student Fee Override / Discount | Accounts |
| 5 | Collect Payment (Counter) | Clerk |
| 6 | Receipt View / Print / Reprint | Clerk |
| 7 | Daily Collection Report | Accounts / Principal |
| 8 | Outstanding / Defaulter Report | Accounts / Principal |

**Also required:** student search and dues breakdown — embedded in counter screen and student detail, not necessarily separate pages.

### 6.3 Backend entities (minimal, V2-aligned)

| Entity | MVP shape |
|--------|-----------|
| Fee heads | Flat (`fee_head_nodes`, no parents) |
| Fee structure | Class × head × amount (`pricing_matrix_rules`, CLASS only) |
| Invoices + line items | Fee demand per period |
| Payments + allocations | What the clerk records |
| Receipts | Number + snapshot JSON |
| Ledger entries | `CHARGE`, `PAYMENT`, `DISCOUNT` — append-only |
| Number sequences | Receipt + invoice numbers |
| Student fee override | One table with effective dates |
| Billing runs | Bulk generation status (no per-student item audit required for MVP) |

### 6.4 Cut from MVP go-live

| Item | MVP alternative |
|------|-----------------|
| Grouping engine | Existing `socialCategory` or one text field |
| Concession schemes | Discount on student / invoice |
| Late fee rules | Manual |
| Bank accounts | Single implicit account |
| Billing run items | Run-level status only |
| 6 extra admin screens | Defer |

---

## 7. Priority Matrix

| Area | Mandatory (go-live) | 6 months | 1 year |
|------|---------------------|----------|--------|
| **Setup** | Fee heads, class fees, session | Mid-year revision UI, transport routes | Fee head hierarchy, custom fields |
| **Billing** | Bulk monthly generate | Ad-hoc charges, one-time event fees | Event engine, installments |
| **Collection** | Pay, partial, receipt, reprint | Cheque bounce, payment reverse | Gateway, parent portal |
| **Discounts** | Per-student fixed / % | Named schemes, sibling auto | Rule engine, approvals |
| **Reports** | Daily collection, outstanding | Fee-head-wise, class summary | Analytics, defaulter automation |
| **Compliance** | Unique receipt numbers | Basic audit on payments | Full audit UI, GST, year-end |
| **Technology** | Ledger + correct balances | Late fee cron, advance credit | Scale, partition, MVs |

---

## 8. Recommended Implementation Split

Split original Phase A into two delivery tracks:

### MVP-A — First production (~8 weeks, 2 engineers)

**Goal:** One Indian private school live on counter billing for a full session month.

| Sprint | Deliverable |
|--------|-------------|
| S1 | Schema: fee heads, pricing matrix (class), invoices, ledger, payments, receipts, number sequences |
| S2 | Fee structure UI + bulk fee generation |
| S3 | Counter: search, dues, collect, receipt print/reprint |
| S4 | Student discount/override + exclude fee head |
| S5 | Daily collection + outstanding reports |
| S6 | Migrate off `fee_records`, UAT with accounts team, go-live |

### Phase A-complete — Post go-live (+4–6 weeks)

**Goal:** Harden for second and third schools without re-architecture.

- Late fee rules + cron
- Transport routes (or flat transport override UX)
- Cheque as first-class payment mode
- Invoice cancel + payment reverse
- Fee-head-wise report
- Advance credit tracking
- Billing run per-student error log
- Audit triggers on financial tables

### Phase B — After ~10 schools (see `BILLING_ENGINE_V2_ARCHITECTURE.md`)

Grouping engine, rule engine V2, events, installments, refunds, document templates, services model.

---

## Bottom Line

| Question | Answer |
|----------|--------|
| What must exist before first production? | Configure class fees → generate monthly demand → collect at counter → numbered receipt → daily + outstanding reports → manual RTE/staff discounts |
| What can wait 6 months? | Late fees, cheques, transport routes, richer reports, waivers, advance credit |
| What can wait 1 year? | Rules, events, installments, refund workflow, online pay, templates, year-end automation, scale |
| Is full Phase A required for go-live? | **No — ~60% is sufficient** |
| Is ledger-first required? | **Yes — internally**, even if the clerk never sees it |

---

*Related documents:*

- [BILLING_ENGINE_ARCHITECTURE.md](./BILLING_ENGINE_ARCHITECTURE.md) — V1 design
- [BILLING_ENGINE_V2_ARCHITECTURE.md](./BILLING_ENGINE_V2_ARCHITECTURE.md) — V2 metadata-driven redesign

*Document generated: June 12, 2026 | SchoolOS Billing MVP Scope*
