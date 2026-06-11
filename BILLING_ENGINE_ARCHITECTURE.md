# SchoolOS — Billing & Collections Engine Architecture

> **Design Principle:** Configuration-driven, ledger-first architecture for any educational organization.  
> Zero code changes needed for new fee structures.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [System Architecture Layers](#2-system-architecture-layers)
3. [Multi-Tenant Architecture](#3-multi-tenant-architecture)
4. [Configuration Layer](#4-configuration-layer)
5. [Database Schema](#5-database-schema)
   - [Configuration Domain](#51-configuration-domain)
   - [Student Domain](#52-student-domain)
   - [Billing Domain](#53-billing-domain)
   - [Ledger Domain](#54-ledger-domain)
   - [Collections Domain](#55-collections-domain)
6. [Ledger Design](#6-ledger-design)
7. [Billing Engine Design](#7-billing-engine-design)
8. [Rule Engine Design](#8-rule-engine-design)
9. [API Design](#9-api-design)
10. [UI Flow](#10-ui-flow)
11. [Indian School Edge Cases](#11-indian-school-edge-cases)
12. [Reports](#12-reports)
13. [Future Scalability](#13-future-scalability)

---

## 1. Core Philosophy

SchoolOS should **never assume**:

- What fee heads exist
- How often fees are charged
- What discounts exist
- What late fee rules apply
- Which payment methods are allowed
- How transport fees work

All of these are **configurable per school**. The system supports 90%+ of Indian schools through configuration alone, without code changes.

---

## 2. System Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer                                               │
│  Fee Config · Student Assignments · Collections ·       │
│  Reports                                                │
├─────────────────────────────────────────────────────────┤
│  API Layer                                              │
│  REST APIs · Auth Middleware · Multi-tenant Routing     │
├─────────────────────────────────────────────────────────┤
│  Billing Engine                                         │
│  Invoice Generator · Cycle Scheduler · Proration ·     │
│  Advance Credit                                         │
├─────────────────────────────────────────────────────────┤
│  Rule Engine                                            │
│  Condition Evaluator · Action Dispatcher ·              │
│  Override Resolver                                      │
├─────────────────────────────────────────────────────────┤
│  Ledger Engine                                          │
│  CHARGE · PAYMENT · DISCOUNT · LATE_FEE · WAIVER ·     │
│  REFUND · ADJUSTMENT                                    │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  Organizations · Fee Heads · Students · Invoices ·      │
│  Ledger · Receipts                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenant Architecture

| Level | Entity | Isolation Boundary |
|-------|--------|--------------------|
| L1 | Platform (SchoolOS) | SaaS layer — shared infrastructure, zero data leakage |
| L2 | Organization | Complete data isolation — separate fee heads, rules, accounts |
| L3 | Academic Year | Annual billing boundary; configs can roll over or reset |
| L4 | Class / Section | Fee structure application target |
| L5 | Student | Final assignment + override layer |

**Implementation:**
- Every table carries an `org_id` column
- JWT tokens embed `org_id` — no tenant ID in URLs
- Row-level security enforced at query level
- Future: schema-per-tenant for enterprise organizations

---

## 4. Configuration Layer

| Config Domain | What Can Be Configured | Scope |
|--------------|------------------------|-------|
| Fee Heads | Tuition, Transport, Hostel, Mess, Lab, Activity, Building Fund, any custom head | Per Organization |
| Billing Cycles | Monthly, Quarterly, Half-Yearly, Annual, One-Time, Custom | Per Fee Head |
| Discount Types | Fixed amount, Percentage, Scholarship, Staff Child, Sibling, Merit | Per Organization |
| Late Fee Rules | Multi-slab: After N days = ₹X; unlimited slabs per rule | Per Organization |
| Payment Methods | Cash, Cheque, UPI, Card, Bank Transfer, Online Gateway | Per Organization |
| Bank Accounts | Main, Fee, Transport, Trust — unlimited accounts, auto-route by fee head | Per Organization |
| Transport | Route + stop-based; custom start/end months per student | Per Student |

---

## 5. Database Schema

> **Global columns on all tables:** `org_id` (multi-tenant), `created_at`, `updated_at`, `deleted_at` (soft-delete). Primary keys are UUIDs.

---

### 5.1 Configuration Domain

#### `organizations`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | varchar(80) UNIQUE | URL-safe tenant identifier |
| name | varchar(255) | School / Institute name |
| type | enum | `SCHOOL \| COACHING \| HOSTEL \| PLAYSCHOOL \| ACADEMY` |
| address | jsonb | `{ street, city, state, pincode }` |
| settings | jsonb | Misc config flags (logo, receipt format, etc.) |
| subscription_plan | varchar | `free \| starter \| pro \| enterprise` |

#### `academic_years`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK → organizations | |
| name | varchar(20) | e.g. `2025-26` |
| start_date | date | |
| end_date | date | |
| is_active | boolean | Only one active year per org |

#### `fee_heads`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | Tuition, Transport, Hostel, etc. |
| code | varchar(20) | Short code for reports (TUIT, TRANS, HOSL) |
| category | enum | `ACADEMIC \| TRANSPORT \| HOSTEL \| ACTIVITY \| CUSTOM` |
| is_optional | boolean | Student can be individually excluded |
| gl_code | varchar(20) | For Tally/ERP accounting integration |
| sort_order | int | Display order on invoice |

#### `billing_cycles`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(50) | Monthly, Quarterly, etc. |
| frequency | enum | `MONTHLY \| QUARTERLY \| HALF_YEARLY \| ANNUAL \| ONE_TIME \| CUSTOM` |
| months | int[] | Which months invoices are generated — e.g. `[4,7,10,1]` for quarterly |
| due_day | int | Day of month invoice is due (e.g. 10) |

#### `fee_structures`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| academic_year_id | uuid FK | |
| fee_head_id | uuid FK → fee_heads | |
| billing_cycle_id | uuid FK → billing_cycles | |
| class_id | uuid FK \| null | null = applies to all classes |
| student_category | varchar \| null | Override for OBC / SC / ST categories |
| amount | numeric(12,2) | Base amount per billing cycle |
| effective_from | date | |
| effective_to | date \| null | |

#### `discount_types`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | Scholarship, Staff Child, Sibling, Merit |
| discount_kind | enum | `FIXED \| PERCENTAGE` |
| value | numeric(10,2) | Amount or percentage |
| applicable_fee_heads | uuid[] \| null | null = all fee heads |
| requires_approval | boolean | |
| max_amount | numeric(12,2) \| null | Cap for percentage-based discounts |

#### `late_fee_rules`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | |
| slabs | jsonb | `[{ "after_days": 10, "amount": 100 }, { "after_days": 20, "amount": 300 }]` |
| applicable_fee_heads | uuid[] \| null | null = all fee heads |
| is_active | boolean | |

#### `bank_accounts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | Main Account, Fee Account, Transport Account |
| account_number | varchar(30) | |
| bank_name | varchar(100) | |
| ifsc | varchar(20) | |
| is_default | boolean | |
| applicable_fee_heads | uuid[] \| null | Auto-route collections to this account |

#### `payment_method_configs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| method | enum | `CASH \| CHEQUE \| UPI \| CARD \| BANK_TRANSFER \| ONLINE_GATEWAY` |
| is_enabled | boolean | |
| gateway_config | jsonb \| null | API keys and settings for online gateways |
| default_account_id | uuid FK → bank_accounts \| null | |

---

### 5.2 Student Domain

#### `students`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_code | varchar(20) | Unique within org |
| name | varchar(255) | |
| class_id | uuid FK | |
| section_id | uuid FK \| null | |
| roll_number | varchar(20) \| null | |
| admission_date | date | Affects first-month proration |
| status | enum | `ACTIVE \| INACTIVE \| GRADUATED \| TC_ISSUED` |
| guardian_info | jsonb | `{ name, phone, email, relation }` |
| category | varchar(50) \| null | OBC / SC / ST for fee concession rules |
| is_staff_child | boolean | Flag for staff-child discount rules |

#### `student_fee_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_id | uuid FK → students | |
| fee_head_id | uuid FK → fee_heads | |
| billing_cycle_id | uuid FK → billing_cycles | |
| amount_override | numeric(12,2) \| null | Override the class-level base amount |
| effective_from | date | |
| effective_to | date \| null | |
| is_excluded | boolean | Student explicitly excluded from this fee head |
| notes | text \| null | Reason for override |

#### `student_discounts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_id | uuid FK → students | |
| discount_type_id | uuid FK → discount_types | |
| approved_by | uuid FK → users \| null | For `requires_approval` discounts |
| effective_from | date | |
| effective_to | date \| null | |
| override_value | numeric(10,2) \| null | Student-specific amount/percent override |

#### `transport_routes`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | e.g. Route-1 (North Zone) |
| vehicle_number | varchar(20) \| null | |
| driver_name | varchar(100) \| null | |

#### `transport_stops`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| route_id | uuid FK → transport_routes | |
| name | varchar(100) | Stop name |
| monthly_fee | numeric(10,2) | Fee for this stop (both-ways) |
| sort_order | int | |

#### `student_transport_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| student_id | uuid FK → students | |
| route_id | uuid FK → transport_routes | |
| stop_id | uuid FK → transport_stops | |
| direction | enum | `ONE_WAY \| BOTH_WAYS` |
| start_month | date | When transport billing begins (first of month) |
| end_month | date \| null | When it ends |

---

### 5.3 Billing Domain

#### `invoices`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| invoice_number | varchar(30) | Auto-generated, immutable once published |
| student_id | uuid FK → students | |
| academic_year_id | uuid FK | |
| billing_period_start | date | |
| billing_period_end | date | |
| invoice_type | enum | `REGULAR \| ADHOC \| TRANSPORT \| HOSTEL \| ADVANCE` |
| status | enum | `DRAFT \| PUBLISHED \| PARTIALLY_PAID \| PAID \| CANCELLED \| OVERDUE` |
| due_date | date | |
| total_charges | numeric(12,2) | Sum of invoice_items.gross_amount |
| total_discounts | numeric(12,2) | Sum of invoice_items.discount_amount |
| total_late_fees | numeric(12,2) | Sum of late fee ledger entries |
| generated_at | timestamp | |
| generated_by | enum | `SYSTEM \| MANUAL` |

#### `invoice_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| invoice_id | uuid FK → invoices | |
| fee_head_id | uuid FK → fee_heads | |
| description | varchar(255) | Human-readable line item label |
| quantity | numeric(8,3) | Default 1; supports fractional for proration |
| unit_amount | numeric(12,2) | |
| gross_amount | numeric(12,2) | `quantity × unit_amount` |
| discount_amount | numeric(12,2) | Total discounts on this item |
| net_amount | numeric(12,2) | `gross − discount` |
| is_transport | boolean | |
| transport_stop_id | uuid FK \| null | |

#### `billing_rules`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | Descriptive rule name |
| priority | int | Lower number = evaluated first |
| is_active | boolean | |
| conditions | jsonb | `[{ "field": "student.class.name", "operator": "eq", "value": "Nursery" }]` |
| actions | jsonb | `[{ "type": "SET_AMOUNT", "fee_head_code": "ACTIVITY", "value": 500 }]` |
| stop_on_match | boolean | Stop evaluating further rules if this matches |

---

### 5.4 Ledger Domain

> **Critical:** Balances are NEVER stored as columns. All outstanding, advance credit, and collection totals are derived by summing ledger entries. This guarantees a perfect, auditable record.

#### `ledger_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_id | uuid FK → students | |
| academic_year_id | uuid FK | |
| entry_type | enum | `CHARGE \| PAYMENT \| DISCOUNT \| LATE_FEE \| WAIVER \| REFUND \| ADJUSTMENT` |
| amount | numeric(12,2) | Always positive |
| direction | enum | `DEBIT \| CREDIT` |
| fee_head_id | uuid FK \| null | Tied to specific fee head if applicable |
| invoice_id | uuid FK → invoices \| null | |
| payment_id | uuid FK → payments \| null | |
| reference_entry_id | uuid FK → ledger_entries \| null | For reversal entries |
| entry_date | date | Business date (may differ from created_at) |
| narration | varchar(500) | Human-readable description for statement |
| created_by | uuid FK → users | Audit trail |
| is_void | boolean | Soft-cancel for display suppression; never hard-deleted |

---

### 5.5 Collections Domain

#### `payments`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| payment_number | varchar(30) | Auto-generated sequential number |
| student_id | uuid FK → students | |
| payment_date | date | |
| amount | numeric(12,2) | Total payment received |
| payment_method | enum | `CASH \| CHEQUE \| UPI \| CARD \| BANK_TRANSFER \| ONLINE` |
| bank_account_id | uuid FK → bank_accounts | Which account was credited |
| transaction_ref | varchar(100) \| null | UTR, cheque no, gateway ref |
| cheque_date | date \| null | |
| cheque_bank | varchar(100) \| null | Bank name for cheque |
| collected_by | uuid FK → users | Staff who accepted payment |
| status | enum | `PENDING \| CLEARED \| BOUNCED \| REVERSED` |
| notes | text \| null | |

#### `payment_allocations`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| payment_id | uuid FK → payments | |
| invoice_id | uuid FK → invoices | |
| invoice_item_id | uuid FK → invoice_items \| null | Item-level allocation (optional) |
| amount | numeric(12,2) | Amount from this payment allocated to this invoice |

#### `receipts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| receipt_number | varchar(30) | Immutable, org-sequential |
| payment_id | uuid FK → payments | |
| student_id | uuid FK → students | |
| receipt_data | jsonb | Full snapshot at time of issue — **never mutated** |
| pdf_url | text \| null | Stored in object storage (Cloudinary / S3) |
| issued_at | timestamp | |
| issued_by | uuid FK → users | |
| is_cancelled | boolean | Cancelled receipts tracked, never deleted |
| cancellation_reason | text \| null | |

---

## 6. Ledger Design

### Entry Type Reference

| Type | Direction | Description | Examples |
|------|-----------|-------------|---------|
| `CHARGE` | DEBIT | A fee imposed on the student | Monthly tuition, transport, hostel rent |
| `PAYMENT` | CREDIT | Cash or instrument received from guardian | Cash, UPI, cheque, online payment |
| `DISCOUNT` | CREDIT | Reduction in charges at time of billing | Scholarship, sibling discount, merit |
| `LATE_FEE` | DEBIT | Penalty charged for delayed payment | ₹100 after 10 days, ₹300 after 20 days |
| `WAIVER` | CREDIT | Post-billing manual fee waiver by admin | Humanitarian waiver, error correction |
| `REFUND` | CREDIT | Money returned to the guardian | Excess payment, TC-time advance refund |
| `ADJUSTMENT` | CREDIT/DEBIT | Advance carry-over or correction entry | Advance credit from last month auto-applied |

### Balance Computation

| Report Metric | Formula |
|---------------|---------|
| Outstanding Balance | `SUM(DEBIT entries) − SUM(CREDIT entries)` |
| Advance Credit | `MAX(0, SUM(CREDIT) − SUM(DEBIT))` |
| Total Collected | `SUM(amount) WHERE entry_type = 'PAYMENT'` |
| Total Discounts Given | `SUM(amount) WHERE entry_type IN ('DISCOUNT', 'WAIVER')` |
| Total Late Fees | `SUM(amount) WHERE entry_type = 'LATE_FEE'` |
| Net Revenue | `SUM(CHARGE + LATE_FEE) − SUM(DISCOUNT + WAIVER + REFUND)` |

### Immutability Rules

- Ledger entries are **never deleted or updated** after creation
- Receipt `receipt_data` JSON is written once — never mutated
- Invoice numbers, once published, never change
- Payment numbers are sequential and permanent
- Errors are corrected by adding a **reversal entry** with `reference_entry_id` pointing to the original
- `is_void = true` for display suppression without deletion
- All reversals carry: user, timestamp, and narration as audit trail

### Sample Ledger — Student Raj, April 2025

| Date | Type | Dir | Fee Head | Amount | Narration | Running Balance |
|------|------|-----|----------|--------|-----------|----------------|
| 01-Apr | CHARGE | DR | Tuition | ₹3,000 | April Tuition | ₹3,000 due |
| 01-Apr | CHARGE | DR | Transport | ₹800 | April Transport | ₹3,800 due |
| 01-Apr | DISCOUNT | CR | Tuition | ₹300 | Sibling Discount | ₹3,500 due |
| 15-Apr | LATE_FEE | DR | — | ₹100 | Late fee: 5 days overdue | ₹3,600 due |
| 18-Apr | PAYMENT | CR | — | ₹5,000 | Cash — Father | ₹1,400 advance |
| 18-Apr | ADJUSTMENT | CR | — | ₹1,400 | Advance credit → May invoice | ₹0 |

### Advance Payment Flow

**Scenario:** Parent pays April + May + June together (₹10,500)

1. **Receive Payment** — `PAYMENT CREDIT` entry for ₹10,500
2. **Allocate to April Invoice** — Allocate ₹3,500 → April invoice. Status → `PAID`
3. **Advance Credit Remains** — ₹7,000 stays as advance credit in ledger
4. **Auto-Adjust on May Invoice** — Engine detects ₹7,000 advance credit and creates `ADJUSTMENT CREDIT` entry to settle May automatically

---

## 7. Billing Engine Design

### Invoice Generation Pipeline

| Step | Stage | Description |
|------|-------|-------------|
| 1 | Schedule Trigger | Cron fires on configured billing cycle dates. Manual trigger also available. |
| 2 | Student Selection | Fetch all `ACTIVE` students in the org with fee assignments active in this billing period. |
| 3 | Fee Head Resolution | (a) Start with class-level `fee_structure`, (b) apply `student_fee_assignments` overrides, (c) honour exclusions. |
| 4 | Proration | If admission date is mid-month: `proration_factor = remaining_days / total_days_in_month`. Configurable per fee head. |
| 5 | Rule Evaluation | Run rule engine against student context. Rules can modify amounts, add/remove fee heads, apply conditional discounts. |
| 6 | Discount Application | Apply all active `student_discounts`. Resolve `FIXED` vs `PERCENTAGE`. Respect `max_amount` caps. |
| 7 | Advance Credit Check | Query ledger for advance credit balance. Auto-apply `ADJUSTMENT` entry to reduce new invoice outstanding. |
| 8 | Invoice Creation | Create `invoices` record + `invoice_items`. Create `CHARGE` ledger entries for each fee head. |
| 9 | Late Fee Check | Separate cron runs daily. For overdue invoices, evaluate `late_fee_rules` slabs and insert `LATE_FEE` ledger entries. |
| 10 | Notification Dispatch | Queue SMS / email / WhatsApp notification to guardian with invoice summary and payment link. |

### Transport Billing Rules

| Scenario | Behavior |
|----------|----------|
| Student joins transport in July | Transport charges begin from July. No retroactive billing. |
| Student leaves transport in November | `end_month = Nov 30`. December onwards no transport charges. |
| Student changes stop mid-year | Old assignment gets `effective_to`. New assignment starts next month. |
| One-way vs Both-ways | `transport_stops.monthly_fee` is for both-ways. One-way charged at 60% (configurable). |
| Summer vacation months | `billing_cycle.months` excludes vacation months. No invoice generated. |

### Sample Annual Billing Schedule

| Fee Head | Cycle | Bill Months | Due Day |
|----------|-------|-------------|---------|
| Tuition | Monthly | April – March (12 invoices) | 10th |
| Transport | Monthly | From student start month | 10th |
| Computer Fee | Quarterly | April, July, October, January | 15th |
| Building Fund | Annual | April only | 30th |
| Hostel Rent | Monthly | From admission month | 5th |
| Exam Board Fee | One-Time | February | Last day of month |
| Annual Day | One-Time | December (rule-triggered) | 15th |

---

## 8. Rule Engine Design

Rules are stored as structured JSON in the database. The engine evaluates conditions against a runtime context object and dispatches actions. No code changes are needed to add new rules.

### Rule JSON Structure

```json
{
  "id": "uuid",
  "name": "Nursery — Activity Fee Override",
  "priority": 10,
  "stop_on_match": false,
  "conditions": [
    { "field": "student.class.name", "operator": "eq", "value": "Nursery" }
  ],
  "actions": [
    { "type": "SET_AMOUNT", "fee_head_code": "ACTIVITY", "value": 500 }
  ]
}
```

### Runtime Context Object

```json
{
  "student": {
    "id": "...",
    "name": "...",
    "class": { "id": "...", "name": "Class 5", "level": 5 },
    "section": "A",
    "category": "OBC",
    "admission_date": "2023-04-01",
    "is_staff_child": false,
    "sibling_count": 1,
    "transport": { "route": "...", "stop": "Zone B" }
  },
  "billing": {
    "month": 4,
    "year": 2025,
    "period_start": "2025-04-01",
    "period_end": "2025-04-30"
  },
  "invoice": {
    "due_date": "2025-04-10",
    "fee_heads": [
      { "code": "TUIT", "gross_amount": 3000, "discount_amount": 0 }
    ]
  },
  "payment": {
    "date": "2025-04-08",
    "method": "UPI",
    "amount": 3000
  }
}
```

### Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal | `student.class.level eq 12` |
| `neq` | Not equal | |
| `gt / gte` | Greater / Greater-or-equal | `student.sibling_count gte 1` |
| `lt / lte` | Less / Less-or-equal | |
| `in` | Value in array | `student.category in ["SC","ST"]` |
| `between` | Inclusive range | `billing.month between [6, 8]` |
| `before / after` | Date comparison | `payment.date before invoice.due_date` |
| `all` | All nested conditions must match (AND) | |
| `any` | Any nested condition matches (OR) | |

### Action Types

| Action Type | Parameters | Description |
|-------------|-----------|-------------|
| `SET_AMOUNT` | `fee_head_code, value` | Override fee amount for a specific head |
| `ADD_PERCENT_DISCOUNT` | `fee_head_code, percent` | Add percentage discount on a fee head |
| `ADD_FIXED_DISCOUNT` | `fee_head_code, amount` | Add fixed rupee discount on a fee head |
| `EXCLUDE_FEE_HEAD` | `fee_head_code` | Remove fee head from invoice entirely |
| `ADD_FEE_HEAD` | `fee_head_code, amount` | Conditionally add an extra fee head |
| `APPLY_EARLY_PAYMENT_DISCOUNT` | `before_day, percent` | Discount if payment received before N-th of month |
| `SET_LATE_FEE_RULE` | `rule_id` | Override the default late fee rule for this student |
| `SET_DUE_DATE` | `offset_days` | Shift the invoice due date by N days |

### Sample Rules for Indian Schools

| Rule Name | Condition | Action |
|-----------|-----------|--------|
| Early Bird Discount | `payment.date BEFORE invoice.due_date` | `ADD_PERCENT_DISCOUNT: Tuition 5%` |
| Nursery Lab Waiver | `student.class.name eq 'Nursery'` | `EXCLUDE_FEE_HEAD: LAB` |
| Sibling Concession | `student.sibling_count gte 1` | `ADD_PERCENT_DISCOUNT: Tuition 10%` |
| SC/ST Building Fund Exemption | `student.category in ['SC','ST']` | `EXCLUDE_FEE_HEAD: BUILDING_FUND` |
| Staff Child Discount | `student.is_staff_child eq true` | `ADD_PERCENT_DISCOUNT: Tuition 50%` |
| Class 12 Board Exam Fee | `student.class.level eq 12 AND billing.month eq 2` | `ADD_FEE_HEAD: BOARD_EXAM ₹1,500` |
| Annual Day Charge | `billing.month eq 12` | `ADD_FEE_HEAD: ANNUAL_DAY ₹500` |
| Hostel Summer Waiver | `billing.month between [5,6] AND student.hostel eq true` | `EXCLUDE_FEE_HEAD: HOSTEL` |

---

## 9. API Design

> Base path: `/api/v1`. All requests require `Authorization: Bearer {token}`. Multi-tenant context resolved from JWT `org_id` claim.

### 9.1 Configuration APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fee-heads` | List all fee heads |
| POST | `/fee-heads` | Create fee head |
| PUT | `/fee-heads/:id` | Update fee head |
| DELETE | `/fee-heads/:id` | Soft-delete fee head |
| GET | `/billing-cycles` | List billing cycles |
| POST | `/billing-cycles` | Create billing cycle |
| GET | `/fee-structures` | List (filter by class, year) |
| POST | `/fee-structures` | Create fee structure |
| PUT | `/fee-structures/:id` | Update amount / dates |
| GET | `/discount-types` | List discount types |
| POST | `/discount-types` | Create discount type |
| PUT | `/discount-types/:id` | Update discount type |
| GET | `/late-fee-rules` | List late fee rules |
| POST | `/late-fee-rules` | Create rule with slabs |
| GET | `/bank-accounts` | List bank accounts |
| POST | `/bank-accounts` | Add account |
| GET | `/payment-methods` | List enabled methods |
| PUT | `/payment-methods/:method` | Enable / disable method |
| GET | `/billing-rules` | List rules (ordered by priority) |
| POST | `/billing-rules` | Create billing rule |
| PUT | `/billing-rules/:id` | Update rule |
| POST | `/billing-rules/evaluate` | Dry-run rule evaluation for a student |

### 9.2 Student APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students` | List (filter, search, paginate) |
| POST | `/students` | Admit student |
| GET | `/students/:id` | Student detail |
| PUT | `/students/:id` | Update student |
| GET | `/students/:id/fee-assignments` | Get fee assignments |
| POST | `/students/:id/fee-assignments` | Assign fee head |
| PUT | `/students/:id/fee-assignments/:asgId` | Update override / dates |
| DELETE | `/students/:id/fee-assignments/:asgId` | Remove assignment |
| GET | `/students/:id/discounts` | List active discounts |
| POST | `/students/:id/discounts` | Apply discount |
| DELETE | `/students/:id/discounts/:dscId` | Remove discount |
| GET | `/students/:id/transport` | Get transport assignment |
| POST | `/students/:id/transport` | Assign route + stop |
| PUT | `/students/:id/transport/:tid` | Update transport |
| GET | `/students/:id/ledger` | Full ledger (filterable) |
| GET | `/students/:id/outstanding` | Computed outstanding balance |
| GET | `/students/:id/advance-credit` | Computed advance credit |
| GET | `/students/:id/invoices` | All invoices for student |

### 9.3 Billing APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/invoices/generate` | Trigger bulk or single-student invoice generation |
| GET | `/invoices` | List invoices (filter by student, period, status) |
| GET | `/invoices/:id` | Invoice detail with items |
| PUT | `/invoices/:id/publish` | Publish draft invoice |
| POST | `/invoices/:id/cancel` | Cancel invoice (creates ledger reversal) |
| POST | `/invoices/:id/late-fee` | Manually trigger late fee check |
| GET | `/invoices/:id/pdf` | Generate and return invoice PDF |
| POST | `/ledger/charge` | Ad-hoc charge entry |
| POST | `/ledger/waiver` | Waiver entry (with approval flow) |
| POST | `/ledger/adjustment` | Manual adjustment entry |
| GET | `/ledger/entries` | List entries (filter by student, date, type) |

### 9.4 Collections APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments` | Record payment (cash/cheque/UPI/online) |
| GET | `/payments` | List (filter by student, date, method) |
| GET | `/payments/:id` | Payment detail with allocations |
| POST | `/payments/:id/reverse` | Reverse / mark bounced |
| POST | `/payments/:id/reallocate` | Re-allocate to different invoices |
| POST | `/payments/bulk-import` | Bulk import from bank statement CSV |
| GET | `/receipts/:id` | Get receipt |
| GET | `/receipts/:id/pdf` | Download receipt PDF |
| POST | `/receipts/:id/cancel` | Cancel receipt with reason |

### 9.5 Reports APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/outstanding` | Outstanding dues (by class, student, fee head) |
| GET | `/reports/collection` | Collection summary (date range, method, staff) |
| GET | `/reports/fee-head-collection` | Fee-head-wise collection breakdown |
| GET | `/reports/student-ledger` | Full ledger statement for a student |
| GET | `/reports/daily-collection` | Day-wise collection register |
| GET | `/reports/account-wise` | Collection totals by bank account |
| GET | `/reports/discounts` | Discounts by type and student |
| GET | `/reports/late-fees` | Late fees charged and collected |
| GET | `/reports/advance-credit` | Students with advance credit balances |
| GET | `/reports/defaulters` | Defaulter list (outstanding > threshold) |
| POST | `/reports/export` | Export any report as XLSX / PDF |

---

## 10. UI Flow

### Module Map

#### Fee Configuration
- Fee Heads Manager
- Billing Cycles Setup
- Fee Structure Builder (class × fee head matrix)
- Discount Types
- Late Fee Rules (slab editor)
- Bank Accounts
- Payment Methods
- Billing Rules (visual editor)

#### Student Billing
- Fee Assignment Screen
- Transport Assignment
- Discount Application
- Invoice Preview (before publish)
- Bulk Invoice Generator
- Student Ledger View
- Advance Credit Dashboard

#### Collections
- Collect Payment Form
- Multi-invoice Payment Selector
- Receipt View & Print
- Bulk Payment Import
- Cheque Register & Clearance
- Advance Adjustment Screen
- Payment Reversal / Bounce

### Journey 1 — Admin Sets Up Fees for New Academic Year

| Step | Action | Screen |
|------|--------|--------|
| 1 | Create academic year 2025-26 | Academic Year Setup |
| 2 | Define all fee heads (Tuition, Transport, Lab…) | Fee Heads Manager |
| 3 | Set billing cycles per fee head | Billing Cycles Setup |
| 4 | Configure amounts per class per fee head | Fee Structure Builder |
| 5 | Set up discount types and values | Discount Types |
| 6 | Configure late fee slabs | Late Fee Rules |
| 7 | Add billing rules (Sibling, Staff Child, etc.) | Billing Rules |
| 8 | Preview fee calculation for a sample student | Student Fee Preview |

### Journey 2 — Monthly Invoice Generation (April)

| Step | Action | Detail |
|------|--------|--------|
| 1 | Trigger generation | Admin clicks 'Generate April Invoices' or cron fires |
| 2 | Student selection | All ACTIVE students with April fee assignments |
| 3 | Rule evaluation | Class-based, discount rules, conditional rules |
| 4 | Invoices in DRAFT | Available for review before publishing |
| 5 | Admin reviews, publishes | Bulk publish or individual review |
| 6 | Notifications sent | SMS / email to guardians with due date |

### Journey 3 — Collect Payment at Counter

| Step | Action | Detail |
|------|--------|--------|
| 1 | Search student | By name, admission number, or phone |
| 2 | View outstanding invoices | Listed with amounts, due dates, days overdue |
| 3 | Select invoice(s) to pay | One or multiple invoices in one payment |
| 4 | Enter payment details | Amount, method, account, reference number |
| 5 | Auto-allocate | System fills oldest invoices first (configurable) |
| 6 | Handle advance | Excess → advance credit, auto-noted on screen |
| 7 | Receipt generated | Printable A4 / thermal, PDF downloadable |
| 8 | SMS / WhatsApp | Instant receipt notification to guardian |

### Journey 4 — Issue Transfer Certificate (TC)

| Step | Action | Detail |
|------|--------|--------|
| 1 | Mark student as TC_ISSUED | Update student status |
| 2 | View outstanding balance | Any pending dues shown |
| 3 | Collect pending dues | Normal collection flow |
| 4 | Refund advance credit | REFUND ledger entry; issue receipt |
| 5 | Cancel future invoices | Upcoming DRAFT invoices cancelled |
| 6 | Fee clearance certificate | Generated from ledger (balance = 0) |

---

## 11. Indian School Edge Cases

| Scenario | System Handling |
|----------|----------------|
| New student mid-year (joins July, April already billed) | Proration on first month. `fee_assignment.effective_from = July`. No retroactive billing. |
| TC student with advance credit | `REFUND` ledger entry for advance balance. Cancel future DRAFT invoices. Issue clearance receipt. |
| Cheque bounced after receipt issued | `REVERSAL` payment entry. Re-open invoices. Add `CHARGE` entry for bounce fee. Cancel original receipt (tracked, not deleted). |
| Mid-year fee revision (tuition hike from August) | New `fee_structure` with `effective_from = Aug 1`. Existing July invoices unaffected. |
| Sibling joins mid-year | Update `student_discounts` for both siblings. `effective_from = joining month`. No retro-billing. |
| Annual Day fee for all students once | One-time fee head. Billing rule: `ADD_FEE_HEAD` on `billing.month = December`. |
| Class promotion (moves to next class) | Update `student.class_id`. New invoices use new class's `fee_structure`. Old invoices unchanged. |
| Wrong cash amount entered | Reverse the payment entry. Create correct entry. Both tracked with narration. |
| Government scholarship reduces fee | `WAIVER` entry with narration. Tracked in discount register for government audit. |
| Due date falls on holiday / Sunday | `due_day` logic checks org holiday calendar. Shifts to next working day. |
| Parent pays for all 3 siblings in one visit | 3 separate payment records (one per student). One receipt per student. |
| Board exam fee payable to external body (CBSE) | Separate fee head with `gl_code` mapped to external liability. Collected as pass-through. |
| RTE students (25% free admission) | Student category = `RTE`. Billing rule: EXCLUDE multiple fee heads or 100% discount on Tuition. |
| Instalment plan (student pays in 3 parts per month) | Multiple partial `PAYMENT` entries against same invoice. `payment_allocations` tracks split. |

---

## 12. Reports

| Report | Purpose | Key Fields |
|--------|---------|-----------|
| Outstanding Report | Defaulter identification | Student, Class, Invoice-wise dues, Days overdue |
| Daily Collection Register | Cashier end-of-day reconciliation | Time, Student, Method, Amount, Collected By, Account |
| Account-wise Collection | Bank reconciliation | Account name, Method breakdown, Total |
| Fee Head Collection | Revenue per fee type | Fee Head, Billed, Collected, Waived, Outstanding |
| Student Ledger Statement | Parent / audit proof | All entries chronologically with running balance |
| Discount Register | Scholarship audit trail | Student, Type, Amount, Approved By, Date |
| Late Fee Register | Penalty revenue tracking | Student, Days Late, Amount Charged, Waived? |
| Advance Credit Report | Liability tracking | Student, Advance Amount, Source Invoice |

---

## 13. Future Scalability

### Database
- **Partition `ledger_entries`** by `(org_id, academic_year_id)`. Old years archived to cold storage after year close.
- **Materialized views** for outstanding balances — refreshed incrementally on each ledger write via trigger.
- **Index strategy:** Composite index `(org_id, student_id, entry_date)` on ledger. Partial index on active invoices.

### Application
- **Bulk invoice generation:** Job queue (BullMQ / Redis). One job per org. Fan-out: one job per 50 students.
- **PDF generation:** Async queue. Store in Cloudinary / S3. Receipt stores URL only, not inline data.
- **Multi-tenant isolation:** Row-level security via `org_id`. Future: schema-per-tenant for enterprise orgs.

### Future Feature Hooks
- Online payment gateway (Razorpay, PayU, CCAvenue) — webhook updates payment status automatically
- Parent mobile app with self-service payment portal
- Tally / ERPNext sync via GL codes on fee heads
- Bank statement auto-reconciliation (import CSV → match PAYMENT entries)
- Multi-campus support under one Organization with separate accounts
- Government scholarship disbursement tracking and reporting

### Coverage Without Code Changes

This architecture supports the following organization types through configuration alone:

- Regular schools — CBSE, ICSE, State board
- Coaching institutes — batch-based, subject-wise billing
- Hostels — mess + accommodation as separate fee heads
- Playschools — hourly / daily programs via custom cycles
- Sports / music academies — seasonal cycles, per-session billing
- Government-aided schools — RTE exemptions, scholarship deductions

---

*Document generated: June 12, 2026 | SchoolOS Billing & Collections Engine Architecture v1.0*
