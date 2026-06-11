# SchoolOS Billing Engine — V2 Review & Redesign

> **Role:** Senior ERP Architect · School ERP Domain Expert · SaaS Multi-Tenant Architect  
> **Objective:** Break the V1 design, find all hardcoded assumptions, redesign into a truly metadata-driven ERP billing engine.

---

## Table of Contents

1. [Critical Flaws in V1](#1-critical-flaws-in-v1)
2. [Missing Entities (34 Identified)](#2-missing-entities)
3. [Metadata-Driven Redesign Principles](#3-metadata-driven-redesign-principles)
4. [Student Grouping Engine](#4-student-grouping-engine)
5. [Fee Engine V2 — Hierarchy + Pricing Matrix](#5-fee-engine-v2)
6. [Rule Engine V2](#6-rule-engine-v2)
7. [New Engines — Concession / Installment / Refund / Document / Audit / Year-End](#7-new-engines)
8. [Schema V2 — All Domains](#8-schema-v2)
9. [Scalability Design](#9-scalability-design)
10. [Migration Plan](#10-migration-plan)

---

## 1. Critical Flaws in V1

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 7 |
| MEDIUM | 6 |
| **Total** | **18** |

**Verdict:** V1 claims to be configuration-driven but burns key business decisions into enums, fixed table structures, and undocumented assumptions. A new school type WILL require schema changes.

---

### F-01 — CRITICAL: student_category is a varchar, not a first-class entity

V1 stores `student_category` as a raw string on the student record. School A uses 'OBC/SC/ST', School B uses 'Day Scholar/Hosteller', School C uses 'Sports Quota/Music'. There is no table, no validation, no multi-dimensional grouping. The rule engine reads `student.category` as a string — this breaks the moment a school needs TWO grouping axes simultaneously (e.g. 'RTE + Hosteller').

**Impact:** Rule engine cannot target multi-dimensional groups. Fee overrides per group combination are impossible.

---

### F-02 — CRITICAL: fee_structures is class-only — breaks coaching, hostel, academy use-cases

`fee_structures.class_id` is the only targeting dimension. A coaching institute bills by batch. A hostel bills by room type. A sports academy bills by sport. A playschool bills by program slot. All of these are impossible without code changes.

**Impact:** The system cannot onboard any non-school organization without schema changes.

---

### F-03 — CRITICAL: billing_cycles.months int[] — cannot model term-based or event-based cycles

Storing months as `[4,7,10,1]` is fragile. It cannot model: coaching 3-month batches starting any month, Term 1/2/3 structures, hostel billing from day of admission, or event-triggered one-time charges on promotion/TC/exam registration.

**Impact:** Any cycle not fitting a 'fixed calendar month' model is broken.

---

### F-04 — CRITICAL: fee_heads is flat — no parent-child hierarchy

Transport cannot have Route Fee + Escort Fee + Pickup Fee as sub-components. Hostel cannot have Room Fee + Mess + Laundry. All aggregation must be done in application logic. Reports cannot roll up by parent fee head.

**Impact:** Fee head tree, grouped invoices, parent-level collection reports are all broken.

---

### F-05 — CRITICAL: organizations.type is a hardcoded enum

`SCHOOL | COACHING | HOSTEL | PLAYSCHOOL | ACADEMY` is burned into the schema. DAYCARE, UNIVERSITY, TUITION_CENTER, GOVERNMENT_SCHOOL, AIDED_SCHOOL — each requires a schema migration.

**Impact:** Platform cannot grow to new verticals without code + schema changes.

---

### F-06 — HIGH: No installment plan engine — billing cycle ≠ payment plan

A school that charges ₹30,000 annually but allows 3 quarterly installments has NO way to model this in V1. `billing_cycles` controls when the invoice is generated, not when payment is due. These are two different concepts that V1 conflates.

**Impact:** Annual-billing schools that allow EMI or custom payment schedules cannot be onboarded.

---

### F-07 — HIGH: Rule engine has flat conditions — no AND/OR nesting, no conflict resolution

`billing_rules.conditions` is a flat jsonb array (implied AND). There is no OR grouping, no nested logic, no rule groups, no conflict resolution strategy when two rules target the same fee head.

**Impact:** Complex real-world rules that schools use daily cannot be expressed.

---

### F-08 — HIGH: No custom fields engine

Schools need Bus Route, Hostel Room Number, Scholarship ID, Sports Category, Government Scheme Number on student records. In V1 there is no way to add these without a schema migration.

**Impact:** Every school that needs a custom attribute requires a code + schema change.

---

### F-09 — HIGH: Discount / Concession / Waiver / Scholarship / Govt Benefit are conflated

V1 uses `discount_types` with `discount_kind FIXED/PERCENTAGE`. This merges five conceptually different things. A government scholarship has disbursement accounts and statutory reporting obligations. A waiver needs managerial approval. These require separate workflows.

**Impact:** Audit reports, government compliance reporting, and approval workflows are impossible.

---

### F-10 — HIGH: Refund engine is a single ledger entry — no workflow

No refund request, no approval, no bank transfer tracking, no refund receipt distinct from payment receipt. A ₹50,000 refund for a TC student with no audit trail is unacceptable in regulated India.

**Impact:** Refunds are invisible events with no compliance trail.

---

### F-11 — HIGH: Academic year has no state machine

`academic_years` has only `is_active`. No OPEN → CLOSED → LOCKED → ARCHIVED state machine. No year-end processing rules. No carry-forward logic for outstanding dues or advance credits.

**Impact:** Year-end processing — the most critical event in a school's calendar — is undefined.

---

### F-12 — HIGH: No audit log table — zero change history

V1 has `created_by` on some tables but no change history. In India, fee structures are regulated by state fee committees. Schools can be audited. Without audit logs, the system cannot support compliance.

**Impact:** Fee revision history, approval trails, and regulatory audits are impossible.

---

### F-13 — MEDIUM: sibling_count in rule context has no backing table

The rule engine context exposes `student.sibling_count` but V1 has no `student_relationships` table. The count is derived from nowhere. When a sibling gets a TC, the count becomes stale.

**Impact:** Sibling discount — one of the most common rules — is based on untracked data.

---

### F-14 — MEDIUM: Receipt format is application-hardcoded — no template engine

`receipts.receipt_data` is a snapshot jsonb but there is no template system. A CBSE school needs a specific layout required by the fee committee. Thermal printers need a 3-inch format.

**Impact:** Schools cannot customize receipt format without a deployment.

---

### F-15 — MEDIUM: No billing event system — lifecycle charges are manual

Admission fees, re-admission fees, promotion fees, transport activation fees — all currently manually created as ad-hoc charges. No event-driven billing.

**Impact:** Operational overhead. Staff forget to charge. Inconsistency across admissions.

---

### F-16 — MEDIUM: ledger_entries.entry_type is a hardcoded enum

`CHARGE | PAYMENT | DISCOUNT | LATE_FEE | WAIVER | REFUND | ADJUSTMENT` — what about `WRITE_OFF`, `GOVERNMENT_GRANT`, `SCHOLARSHIP_DISBURSEMENT`, `BOUNCED_CHEQUE_CHARGE`?

**Impact:** Ledger cannot accommodate new financial event types without code changes.

---

### F-17 — MEDIUM: No cohort / batch concept — coaching institutes break

Coaching institutes have batches: 'JEE Batch A Morning', 'NEET Foundation Weekends'. `fee_structures.class_id` maps to school classes only.

**Impact:** Coaching institute onboarding requires schema changes.

---

### F-18 — MEDIUM: Payment allocation strategy is hardcoded

The design states 'oldest invoices first (configurable)' but there is no `allocation_strategy` field in the schema. Configurable means nothing without persistence.

**Impact:** Schools with specific allocation requirements get incorrect ledger entries.

---

## 2. Missing Entities

34 tables absent from V1 that are required for schema-free onboarding:

| Entity | Domain | Why It's Needed |
|--------|--------|----------------|
| `student_group_dimensions` | Students | Defines grouping axes per org: 'Boarding Status', 'Quota Category' |
| `student_groups` | Students | Values within each dimension: 'Day Scholar', 'Hosteller', 'RTE' |
| `student_group_memberships` | Students | Multi-dimensional group assignments with effective dates |
| `student_relationships` | Students | Sibling/twin links — sibling_count is derived from this |
| `cohorts` | Students | Batch concept for coaching institutes |
| `custom_field_definitions` | Metadata | Schema-free extensibility for student/invoice fields per org |
| `custom_field_values` | Metadata | EAV values for custom fields — no schema change for new fields |
| `org_types` | Platform | Replaces hardcoded organizations.type enum |
| `org_config` | Platform | Typed key-value store replacing untyped settings jsonb blob |
| `fee_head_nodes` | Billing | Hierarchical tree replacing flat fee_heads |
| `pricing_matrix_rules` | Billing | Multi-dimensional pricing: class + group + cohort + custom field |
| `billing_event_definitions` | Billing | Event registry for lifecycle-triggered charges |
| `billing_event_charges` | Billing | What charges each event triggers |
| `billing_cycle_definitions` | Billing | Replaces months int[] with flexible, event-aware cycle definitions |
| `installment_plan_definitions` | Billing | Payment schedule independent of invoice generation cycle |
| `installment_plan_schedules` | Billing | Per-installment due dates and amount splits |
| `student_installment_assignments` | Billing | Student-specific installment plan overrides |
| `concession_schemes` | Concessions | Separates Discount / Concession / Waiver / Scholarship / Govt Benefit |
| `concession_applications` | Concessions | Application, approval, active status per student |
| `service_types` | Services | Generalizes Transport — hostel, cafeteria, sports use same model |
| `service_routes` | Services | Route definitions per service type |
| `student_service_assignments` | Services | Student subscription to any service with start/end dates |
| `refund_requests` | Refunds | Full workflow: request → approval → processing → receipt |
| `refund_request_items` | Refunds | Line-item breakdown of what is being refunded |
| `document_templates` | Documents | Per-school receipt/invoice templates with branding |
| `academic_year_events` | Calendar | State machine: SETUP, OPEN, CLOSED, LOCKED, ARCHIVED |
| `year_end_carry_forward_rules` | Calendar | What to carry forward (dues, advance credit) to next year |
| `approval_workflows` | Compliance | Reusable approval engine for waivers, refunds, fee revisions |
| `approval_instances` | Compliance | Running approval instances with current state and history |
| `audit_logs` | Compliance | Immutable log: who changed what, old value, new value, when, why |
| `rule_groups` | Rules | Named rule groups with conflict resolution strategy per group |
| `rule_versions` | Rules | Version history of every rule change |
| `payment_allocation_strategies` | Collections | Configurable: oldest-first, current-month-first, fee-head-priority |
| `ledger_entry_type_definitions` | Ledger | Extensible entry types without code change |

---

## 3. Metadata-Driven Redesign Principles

### The 8 Transformation Principles

| # | Principle | V1 (Broken) | V2 (Fixed) |
|---|-----------|-------------|-----------|
| 1 | Replace Enums with Configurable Entities | `organizations.type = SCHOOL \| COACHING` (hardcoded) | `org_types` table — new type = insert a row |
| 2 | Replace Fixed Columns with Custom Fields | `student.category varchar` — one dimension, no validation | `custom_field_definitions` + `custom_field_values` — unlimited typed dimensions |
| 3 | Replace Fixed Grouping with Dimension Engine | `student.category = 'RTE'` — single axis | `student_group_dimensions` + memberships — unlimited validated axes |
| 4 | Replace Fixed Hierarchy with Tree Nodes | `fee_heads` flat table — no parent-child | `fee_head_nodes` with `parent_id` + ltree path |
| 5 | Replace Class-Only Pricing with Matrix Engine | `fee_structures.class_id` — one dimension | `pricing_matrix_rules` — any dimension combination |
| 6 | Replace Hardcoded Events with Event Registry | Ad-hoc charges for admission, promotion | `billing_event_definitions` — any lifecycle event triggers a charge |
| 7 | Replace Hardcoded Workflows with Pipelines | `REFUND` = single ledger entry | Full workflow: request → approval → processing → receipt |
| 8 | Replace Settings Blob with Config Store | `organizations.settings jsonb` — untyped | `org_config` table with typed keys and validation |

### Custom Fields Engine

#### custom_field_definitions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| entity_type | enum | `STUDENT \| INVOICE \| PAYMENT \| RECEIPT` |
| field_key | varchar(50) | e.g. `bus_route`, `hostel_room` |
| label | varchar(100) | Display name |
| field_type | enum | `TEXT \| NUMBER \| DATE \| SELECT \| BOOLEAN` |
| options | jsonb \| null | For SELECT: list of allowed values |
| is_required | boolean | |
| is_searchable | boolean | Index this field for search |

#### custom_field_values

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| field_def_id | uuid FK → custom_field_definitions | |
| entity_type | enum | `STUDENT \| INVOICE \| PAYMENT` |
| entity_id | uuid | ID of the student / invoice / payment |
| value_text | text \| null | |
| value_number | numeric \| null | |
| value_date | date \| null | |
| value_boolean | boolean \| null | |

#### Example Custom Fields by School Type

| School Type | Field Key | Field Type | Purpose |
|-------------|-----------|-----------|---------|
| CBSE School | `bus_route` | SELECT | Transport fee auto-assignment via rule engine |
| Hostel | `hostel_room_number` | TEXT | Room-based billing |
| Govt School | `gov_scholarship_id` | TEXT | Scholarship disbursement tracking |
| Sports Academy | `sport_category` | SELECT | Sport-specific fee head via rule |
| Coaching | `batch_name` | SELECT | Batch-based pricing matrix targeting |
| Music Academy | `instrument` | SELECT | Instrument maintenance fee trigger |
| Aided School | `rte_status` | BOOLEAN | RTE exemption trigger in billing rules |

---

## 4. Student Grouping Engine

### Core Problem with V1

`student_category` is a single-dimension varchar. A student cannot simultaneously be 'RTE' AND 'Hosteller'. Multi-dimensional grouping — the foundation of flexible fee targeting — is impossible.

### V2 Multi-Dimensional Grouping

#### student_group_dimensions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | e.g. 'Boarding Status', 'Quota Category' |
| code | varchar(30) | e.g. `BOARDING`, `QUOTA` |
| is_required | boolean | Every student must have a value |
| allows_multiple | boolean | Can student be in >1 group in this dimension |

#### student_groups

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| dimension_id | uuid FK → student_group_dimensions | |
| name | varchar(100) | e.g. 'Day Scholar', 'Hosteller' |
| code | varchar(30) | e.g. `DAY`, `HOSTELLER` |
| is_active | boolean | |

#### student_group_memberships

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| student_id | uuid FK → students | |
| group_id | uuid FK → student_groups | |
| effective_from | date | |
| effective_to | date \| null | |
| assigned_by | uuid FK → users | |

### Dimension Examples by Organization Type

| Organization | Dimension | Group Values |
|-------------|-----------|-------------|
| CBSE School | Reservation Category | General, OBC, SC, ST, RTE, EWS |
| CBSE School | Boarding Status | Day Scholar, Boarder |
| ICSE School | Admission Basis | Regular, Sports Quota, Staff Child, Management |
| Coaching Institute | Program | JEE Main, JEE Advanced, NEET, Foundation |
| Hostel | Room Type | Single, Double, Triple, Dormitory |
| Sports Academy | Sport | Cricket, Football, Badminton, Swimming |
| Govt School | Scheme Eligibility | Scholarship, Mid-day Meal, Free Textbook |
| Music Academy | Instrument | Vocal, Piano, Violin, Guitar, Tabla |
| Playschool | Program Slot | Full Day, Half Day Morning, Half Day Evening |

### student_relationships (Sibling Tracking)

**V1 Flaw:** `student.sibling_count` in rule context has no backing table. V2 fixes this.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_id_a | uuid FK → students | |
| student_id_b | uuid FK → students | |
| relationship_type | enum | `SIBLING \| TWIN` |
| verified_at | timestamp \| null | |

### cohorts (Batch Concept for Coaching)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | JEE Batch A — Morning 2025 |
| code | varchar(30) | |
| start_date | date | |
| end_date | date \| null | |
| capacity | int \| null | |

---

## 5. Fee Engine V2

### V2 Fee Head Hierarchy

#### fee_head_nodes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| parent_id | uuid FK → fee_head_nodes \| null | null = root |
| name | varchar(100) | |
| code | varchar(20) | |
| level | int | 0=root, 1=category, 2=sub-item |
| path | ltree | Materialized: `TRANSPORT.ROUTE_FEE` |
| is_billable | boolean | Can charges be made at this node? |
| gl_code | varchar(20) \| null | For Tally/ERP integration |

#### Example Fee Tree

```
Transport (parent, not billable)
 ├─ Route Fee (billable)
 ├─ Escort Fee (billable)
 └─ Pickup Fee (billable)
Hostel (parent, not billable)
 ├─ Room Rent (billable)
 ├─ Mess Fee (billable)
 │   ├─ Breakfast (billable)
 │   └─ Lunch + Dinner (billable)
 └─ Laundry (billable)
```

### Pricing Matrix Engine

#### pricing_matrix_rules

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| academic_year_id | uuid FK | |
| fee_head_id | uuid FK → fee_head_nodes | |
| billing_cycle_id | uuid FK | |
| priority | int | Higher = evaluated later; LAST_MATCH wins by default |
| applicability | jsonb | `[{type:'CLASS', value:'Class-5'}, {type:'GROUP', dim:'BOARDING', value:'HOSTELLER'}]` |
| amount | numeric(12,2) | |
| amount_formula | text \| null | For computed amounts |
| effective_from | date | |
| effective_to | date \| null | |

#### Applicability Condition Types

| Type | Matches On | Example |
|------|-----------|---------|
| `CLASS` | student.class_id | Class 5, Class 10 |
| `CLASS_RANGE` | student.class.level between | Classes 1–5 |
| `GROUP` | student_group_memberships (by dimension) | `BOARDING=Hosteller` |
| `COHORT` | student.cohort_id | JEE Batch A |
| `CUSTOM_FIELD` | custom_field_values | `bus_route = 'Zone B'` |
| `ADMISSION_DATE` | student.admission_date range | Admitted before 2024-04-01 |
| `ALL` | No condition — global default | Base fee for all |

#### Pricing Resolution Algorithm

1. Collect all `pricing_matrix_rules` for this fee_head + billing_cycle + academic_year
2. Filter to rules where applicability conditions match the student context
3. Sort matching rules by priority ascending
4. Apply `conflict_resolution_strategy`: `LAST_MATCH` | `FIRST_MATCH` | `MIN` | `MAX`
5. Apply `student_fee_assignments.amount_override` if present (always wins)
6. Result = resolved amount for this student × this fee head

### Billing Event Triggers

#### billing_event_definitions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| event_code | varchar(50) | `STUDENT_ADMITTED \| STUDENT_PROMOTED \| TC_ISSUED \| TRANSPORT_ACTIVATED \| EXAM_REGISTERED \| CUSTOM` |
| name | varchar(100) | |
| is_active | boolean | |

#### billing_event_charges

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_def_id | uuid FK | |
| fee_head_id | uuid FK → fee_head_nodes | |
| amount_source | enum | `FIXED \| PRICING_MATRIX \| FORMULA` |
| fixed_amount | numeric \| null | |
| is_one_time_per_student | boolean | Only charge once per student lifetime |
| applicability | jsonb \| null | Conditions: only charge if student matches |

---

## 6. Rule Engine V2

### Key Upgrades Over V1

| Feature | V1 | V2 |
|---------|----|----|
| Condition logic | Flat AND only | Nested AND / OR / NOT tree |
| Rule groups | None | Named groups with enable/disable |
| Conflict resolution | Undefined | Per-group configurable strategy |
| Versioning | None | Full version history per rule |
| Non-technical admin UI | Impossible | Supported via description field |

### Nested Condition Structure

```json
{
  "op": "AND",
  "nodes": [
    {
      "op": "OR",
      "nodes": [
        { "field": "student.class.level", "op": "gte", "val": 9 },
        { "field": "student.groups.BOARDING", "op": "eq", "val": "HOSTELLER" }
      ]
    },
    { "field": "billing.month", "op": "eq", "val": 4 }
  ]
}
```

### rule_groups

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | e.g. 'Government Concessions', 'Early Bird' |
| priority | int | Group evaluation order |
| conflict_strategy | enum | `FIRST_MATCH \| ALL_MATCH \| HIGHEST_PRIORITY \| MAX_DISCOUNT` |
| is_active | boolean | Toggle entire group on/off |

### billing_rules_v2

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| group_id | uuid FK → rule_groups \| null | |
| name | varchar(100) | |
| description | text \| null | Plain-English explanation for non-technical admin UI |
| priority | int | Within group |
| conditions | jsonb | Recursive tree: `{ op: 'AND\|OR\|NOT', nodes: [...] \| leaf }` |
| actions | jsonb | Array: `[{ type, params }]` |
| stop_after_this | boolean | Stop evaluating remaining rules in group |
| version | int | Incremented on each update |

### Expanded Action Vocabulary

| Action Type | Parameters | Description |
|-------------|-----------|-------------|
| `SET_AMOUNT` | fee_head_code, value | Override amount |
| `ADD_PERCENT_DISCOUNT` | fee_head_code, percent, cap | Percentage discount with rupee cap |
| `ADD_FIXED_DISCOUNT` | fee_head_code, amount | Fixed discount |
| `EXCLUDE_FEE_HEAD` | fee_head_code | Remove from invoice |
| `ADD_FEE_HEAD` | fee_head_code, amount_source | Conditionally add |
| `APPLY_CONCESSION_SCHEME` | scheme_id | Apply a full concession scheme |
| `SET_INSTALLMENT_PLAN` | plan_id | Assign installment plan |
| `APPLY_LATE_FEE_RULE` | rule_id | Override late fee rule |
| `TRIGGER_APPROVAL` | workflow_id | Require approval before applying |
| `SET_PAYMENT_ALLOCATION` | strategy | Override allocation strategy |

---

## 7. New Engines

### 7.1 Concession Engine

#### Concession Type Taxonomy

| Type | Nature | Approval | Reportable To |
|------|--------|----------|--------------|
| `STRUCTURAL_DISCOUNT` | Built into fee structure | None | Internal only |
| `CONCESSION` | Recurring reduction (sibling, staff child) | Manager | Internal audit |
| `WAIVER` | One-time post-billing reduction | Principal / Trust | Audit committee |
| `SCHOLARSHIP` | Merit/need-based, possibly externally funded | Scholarship committee | External / Regulatory |
| `GOVERNMENT_BENEFIT` | RTE, state scheme, central scheme | Govt authority | Statutory |
| `WRITE_OFF` | Bad debt, unrecoverable dues | Board / Trustee | Financial audit |

#### concession_schemes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| concession_type | enum | See taxonomy above |
| discount_kind | enum | `FIXED \| PERCENTAGE \| FULL` |
| value | numeric(10,2) | |
| approval_workflow_id | uuid FK → approval_workflows \| null | |
| funding_account_id | uuid FK → bank_accounts \| null | For govt schemes disbursed separately |
| external_ref_required | boolean | e.g. RTE registration number |

---

### 7.2 Installment Engine

**Core insight:** Billing cycle ≠ payment plan. These are independent concepts.
- `billing_cycle` → when the INVOICE is generated
- `installment_plan` → when PAYMENT is due

#### installment_plan_definitions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | e.g. 'Quarterly in 4 parts' |
| total_parts | int | |
| split_method | enum | `EQUAL \| CUSTOM_PERCENT \| CUSTOM_AMOUNT` |
| late_fee_rule_id | uuid FK \| null | Per-installment late fee rule |

#### installment_plan_schedules

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| plan_id | uuid FK | |
| installment_number | int | 1, 2, 3... |
| due_month | int | Month of year (4=April) |
| due_day | int | Day of month |
| percent_of_total | numeric(5,2) \| null | |
| fixed_amount | numeric(12,2) \| null | |

#### Ledger Impact

| Event | Ledger Entry | Notes |
|-------|-------------|-------|
| Annual invoice generated (April) | `CHARGE DEBIT ₹30,000` | Full annual charge created once |
| Installment 1 due (April 10) | No new entry | Due date tracked on installment_plan_schedules |
| Installment 1 paid (April 8) | `PAYMENT CREDIT ₹7,500` | Against the annual invoice |
| Installment 2 not paid (July 20) | `LATE_FEE DEBIT ₹100` | Per-installment late fee, not full balance |

---

### 7.3 Refund Engine

#### V2 Refund Workflow

1. **Request** — Staff creates `refund_request` with line items and reason
2. **Validation** — System verifies student has credit balance for requested amount
3. **Approval** — `approval_instance` created; routes to approvers based on amount thresholds
4. **Processing** — Bank transfer / cheque / online initiated. Transaction ref recorded.
5. **Ledger Update** — `REFUND CREDIT` entries created per fee head with `reference_entry_id = refund_request.id`
6. **Receipt** — Refund receipt generated from `document_templates`. Stored immutably.
7. **Audit** — Every state change written to `audit_logs` with old_state, new_state, actor, timestamp

#### refund_requests

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| student_id | uuid FK | |
| request_number | varchar(30) | Auto-generated |
| status | enum | `DRAFT \| PENDING_APPROVAL \| APPROVED \| REJECTED \| PROCESSING \| COMPLETED \| CANCELLED` |
| total_amount | numeric(12,2) | |
| refund_method | enum \| null | `CASH \| CHEQUE \| BANK_TRANSFER \| UPI \| ONLINE` |
| approval_instance_id | uuid FK → approval_instances \| null | |
| transaction_ref | varchar(100) \| null | Set on completion |

---

### 7.4 Document Engine

#### Document Types

| Doc Type | Format Options | Trigger |
|----------|--------------|---------|
| `INVOICE` | A4 PDF, Email HTML | On invoice publish |
| `PAYMENT_RECEIPT` | A4 PDF, Thermal 80mm, Email HTML, WhatsApp | On payment recorded |
| `REFUND_RECEIPT` | A4 PDF, Email HTML | On refund completed |
| `STUDENT_LEDGER` | A4 PDF, Excel | On demand |
| `FEE_CLEARANCE_CERTIFICATE` | A4 PDF | On TC issue |
| `OUTSTANDING_NOTICE` | A4 PDF, Email HTML, SMS | On overdue |

#### document_templates

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| doc_type | enum | See above |
| format | enum | `A4_PDF \| THERMAL_80MM \| THERMAL_57MM \| EMAIL_HTML \| WHATSAPP` |
| is_default | boolean | |
| header_template | text | Handlebars template string |
| body_template | text | |
| footer_template | text | |
| css_overrides | text \| null | Custom CSS for PDF rendering |
| color_scheme | jsonb \| null | `{ primary, secondary }` using school branding |

---

### 7.5 Audit & Compliance

#### audit_logs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| table_name | varchar(100) | Which table changed |
| record_id | uuid | Which record |
| action | enum | `INSERT \| UPDATE \| DELETE \| APPROVE \| REJECT \| VOID` |
| actor_id | uuid FK → users | |
| old_values | jsonb \| null | Full row before change |
| new_values | jsonb \| null | Full row after change |
| changed_fields | text[] | Which specific fields changed |
| reason | text \| null | Why the change was made |
| occurred_at | timestamp | Set by DB trigger — immutable |

#### Approval Workflow

- `approval_workflows` — defines workflow per entity type (WAIVER, REFUND, FEE_REVISION) with amount thresholds
- `approval_steps` — steps with approver_role, timeout_hours for auto-escalation
- `approval_instances` — running instance of a workflow with current state
- `approval_instance_steps` — per-step history with actor, timestamp, comments

---

### 7.6 Academic Year State Machine

#### States

| State | Description |
|-------|-------------|
| `SETUP` | Year created, fee structures being configured. No invoices yet. |
| `OPEN` | Active year. Invoices being generated and collected. |
| `CLOSED` | Year ended. No new invoices. Collections still accepted for outstanding. |
| `LOCKED` | Locked by admin. No more entries. Year-end reconciliation complete. |
| `ARCHIVED` | Data archived. Read-only. Audit access only. |

#### year_end_carry_forward_rules

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| rule_type | enum | `OUTSTANDING_DUES \| ADVANCE_CREDIT \| SPECIFIC_FEE_HEAD` |
| action | enum | `CARRY_FORWARD \| WRITE_OFF \| NOTIFY_ONLY \| BLOCK_PROMOTION` |
| fee_head_id | uuid FK \| null | null = applies to all |
| threshold_days_overdue | int \| null | Only carry forward if overdue > N days |
| notify_guardian_before_carry | boolean | |

#### Year-End Processing Pipeline

| Step | Action | Detail |
|------|--------|--------|
| 1 | Freeze new invoices | Set `academic_year.status = CLOSED` |
| 2 | Final late fee sweep | Apply pending late fees on all overdue invoices |
| 3 | Reconcile advance credits | List all students with credit balance > 0 |
| 4 | Apply carry-forward rules | Per rules: carry / write off / notify guardian |
| 5 | Generate year-end statements | Student-wise ledger statements |
| 6 | Copy fee structure to new year | Admin selects heads and amounts to roll over |
| 7 | Lock old year | `status = LOCKED`. No more entries. |
| 8 | Activate new year | `status = OPEN` |

---

## 8. Schema V2

### Domain Summary (13 domains, ~50 tables)

| Domain | Tables | Key Changes from V1 |
|--------|--------|-------------------|
| Platform & Tenancy | organizations, org_types, org_config | org.type is FK to org_types (no more enum) |
| Academic Calendar | academic_years, academic_year_periods, academic_year_events, year_end_carry_forward_rules | State machine, term/period support |
| Student & Grouping | students, student_group_dimensions, student_groups, student_group_memberships, student_relationships, cohorts, custom_field_definitions, custom_field_values | Full multi-dimensional grouping engine |
| Fee Configuration | fee_head_nodes, billing_cycle_definitions, pricing_matrix_rules, billing_event_definitions, billing_event_charges | Tree hierarchy, multi-dimensional pricing, event triggers |
| Concession & Rules | concession_schemes, concession_applications, rule_groups, billing_rules_v2, rule_versions | 5 concession types, nested conditions, versioning |
| Installment Plans | installment_plan_definitions, installment_plan_schedules, student_installment_assignments | Brand new — billing cycle ≠ payment schedule |
| Generalized Services | service_types, service_routes, service_stops, student_service_assignments | Transport is a special case of a generic service model |
| Invoices & Ledger | invoices, invoice_items, ledger_entries, ledger_entry_type_definitions | Extensible entry types |
| Collections | payments, payment_allocations, payment_allocation_strategies, receipts | Configurable allocation strategies |
| Refunds | refund_requests, refund_request_items | Brand new — full workflow |
| Approvals | approval_workflows, approval_steps, approval_instances, approval_instance_steps | Brand new — reusable approval engine |
| Documents | document_templates, document_template_sections, generated_documents | Brand new — template engine |
| Audit & Compliance | audit_logs | Brand new — immutable change history |

### Generalized Service Model

V1 hardcodes transport as a concept. V2 generalizes it: transport, hostel, cafeteria, sports, music lessons are all configurable "services" students subscribe to.

#### service_types

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK | |
| name | varchar(100) | Transport, Hostel, Cafeteria, Sports |
| code | varchar(30) | |
| fee_head_id | uuid FK → fee_head_nodes | Auto-link to fee head |
| has_routes | boolean | Whether routes/stops apply |
| billing_cycle_id | uuid FK | |

#### student_service_assignments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| student_id | uuid FK | |
| service_type_id | uuid FK → service_types | |
| service_route_id | uuid FK \| null | |
| service_stop_id | uuid FK \| null | |
| direction | varchar(20) \| null | ONE_WAY / BOTH_WAYS |
| start_date | date | |
| end_date | date \| null | |
| custom_attributes | jsonb \| null | Room number, sport, instrument, etc. |

---

## 9. Scalability Design

**Target:** 500 Schools · 50,000 Students · 500K Invoices/year · 10M Ledger Entries

### Indexing Strategy

| Table | Index | Reason |
|-------|-------|--------|
| `ledger_entries` | `(org_id, student_id, entry_date DESC)` | Student ledger — most common report |
| `ledger_entries` | `(org_id, academic_year_id, entry_type)` | Fee head collection report |
| `ledger_entries` | `(org_id, entry_date) WHERE NOT is_void` | Daily collection — partial index |
| `invoices` | `(org_id, status, due_date) WHERE status != 'PAID'` | Outstanding report — partial index |
| `invoices` | `(org_id, student_id, academic_year_id)` | Student invoice history |
| `student_group_memberships` | `(group_id, effective_from, effective_to)` | Group-based billing targeting |
| `pricing_matrix_rules` | `(org_id, academic_year_id, fee_head_id)` | Pricing resolution |
| `audit_logs` | `(org_id, table_name, record_id, occurred_at DESC)` | Compliance audit |

### Partitioning

| Table | Partition Key | Strategy |
|-------|--------------|---------|
| `ledger_entries` | org_id + academic_year_id | Range by year. Old years on cold storage. |
| `invoices` | org_id + billing_period_start | Range by quarter. Active quarter hot, rest warm. |
| `audit_logs` | occurred_at | Range by month. 13-month hot, archive rest. |
| `payments` | org_id + payment_date | Range by quarter. |
| `generated_documents` | created_at | Range by month. Only last 6 months in hot storage. |

### Materialized Views

| View | Refresh | Used For |
|------|---------|---------|
| `mv_student_outstanding` | On every ledger entry write (incremental) | Balance shown on every payment screen |
| `mv_fee_head_collection_monthly` | Nightly | Fee head collection report |
| `mv_daily_collection_summary` | Every 5 minutes | Real-time daily collection dashboard |
| `mv_class_wise_outstanding` | Nightly | Outstanding report by class |
| `mv_advance_credit_balances` | On PAYMENT / ADJUSTMENT write | Advance credit screen |

### Background Jobs

| Job | Trigger | Concurrency |
|-----|---------|------------|
| Invoice Generation | Cron per org or manual | 1 job per org; fan-out to batches of 50 students |
| Late Fee Sweep | Daily cron per org | 1 job per org |
| PDF Generation | On payment / invoice publish | Worker pool of 10; queue-backed |
| SMS / Email Dispatch | On payment / invoice / overdue | Worker pool of 20; retry with backoff |
| MV Refresh | DB trigger on ledger write | Async, debounced per student |
| Year-End Processing | Manual admin trigger | Single serialized job per org |
| Audit Log Writer | DB trigger on regulated tables | Synchronous — must never lose records |

### Caching Strategy

| What | Layer | TTL |
|------|-------|-----|
| org_config, fee_head_nodes, billing_cycles | Application memory (per process) | 5 min; invalidate on update |
| pricing_matrix_rules for active academic year | Redis | 1 hour; invalidate on rule change |
| Student outstanding balance | Redis (per student key) | Invalidate on each ledger write |
| Rule evaluation result per student per month | Redis | Until any rule in org changes |
| Document template compiled output | Application memory | Until template is updated |

---

## 10. Migration Plan

**Principle:** No Big Bang. Every phase is incremental, non-breaking, and reversible.

| Phase | Name | Risk | Duration |
|-------|------|------|---------|
| 1 | Non-breaking additions | Low | 2 weeks |
| 2 | Student grouping migration | Medium | 1 week |
| 3 | Fee structure migration | High | 2 weeks |
| 4 | New engines activation | Low | 3 weeks |
| 5 | Year-end engine + performance | Medium | 2 weeks |

### Phase 1 — Non-Breaking Additions

1. Add `audit_logs` table with DB triggers on all regulated tables
2. Add `custom_field_definitions` + `custom_field_values` (no V1 breakage)
3. Add `student_relationships` table
4. Add `rule_versions` table — start versioning existing rules
5. Add `approval_workflows` tables — wire to existing discount flow

### Phase 2 — Student Grouping Migration

1. Create `student_group_dimensions` seeded with 'Reservation Category' per org
2. Create `student_groups` for all distinct `student.category` values per org
3. Backfill `student_group_memberships` from existing `student.category` strings
4. Update rule engine to read from `student_group_memberships` (keep old path live)
5. Deprecate `student.category` column — remove in Phase 4

### Phase 3 — Fee Structure Migration (High Risk)

1. Create `fee_head_nodes` from existing `fee_heads` (all flat = root level initially)
2. Create `pricing_matrix_rules` with CLASS applicability from existing `fee_structures`
3. Run dual billing engine: V1 + V2 in parallel, compare outputs for 1 billing cycle
4. On output match, switch all orgs to V2 pricing engine
5. Archive V1 `fee_structures` (stop writes, keep for reference)

### Phase 4 — New Engines Activation

1. Activate installment plan engine for new academic year
2. Activate billing event triggers (admission, promotion, transport activation)
3. Deploy document template engine; seed with default templates per org
4. Migrate existing `discount_types` to `concession_schemes` with correct taxonomy
5. Activate refund workflow engine
6. Remove deprecated columns: `student.category`, `organizations.type` enum

### Phase 5 — Year-End Engine + Performance

1. Implement academic_year state machine
2. Run first year-end processing on test orgs
3. Deploy materialized views for outstanding and collection reports
4. Implement Redis caching layer for pricing rules and balances
5. Partition `ledger_entries` by academic year
6. Verify query performance at projected scale with synthetic data

---

## Future-Proofing Checklist

| Concern | V2 Solution | Remaining Risk |
|---------|------------|---------------|
| New org type (Daycare, University) | `org_types` table — insert a row | None |
| New fee head category | `fee_head_nodes` — any hierarchy, any depth | None |
| New student grouping axis | `student_group_dimensions` — insert a row | None |
| New billing cycle pattern | `billing_cycle_definitions` — flexible config | None |
| New discount / concession type | `concession_schemes` — insert a row | None |
| New rule condition field | Expose field in context object — code change only | Low |
| New rule action type | Implement action handler — code change only | Low |
| New payment gateway | `payment_method_configs.gateway_config` + adapter | Low |
| New ledger entry type | `ledger_entry_type_definitions` — insert a row | None |
| Multi-currency | Add `currency_code` to invoices, ledger, payments + exchange rate table | Medium |
| Multi-campus | Add `campus_id` as a student dimension and filter dimension | Low — additive |
| Government API (RTE portal) | External adapter + `gov_ref` on `concession_applications` | Medium |

---

*Document generated: June 12, 2026 | SchoolOS Billing Engine V2 Architecture*  
*Reviewed as: Senior ERP Architect · School ERP Domain Expert · SaaS Multi-Tenant Architect*
