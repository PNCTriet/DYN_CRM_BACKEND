# Schema Design — DYN CRM (authoritative DB contract)

> Vietnamese: [SchemaDesign.vi.md](./SchemaDesign.vi.md)  
> Source DBML: [`schema.sql`](./schema.sql)  
> Review: [`DbReview.md`](./DbReview.md)  
> Traceability: [`TraceabilityMatrix.md`](./TraceabilityMatrix.md)

**Status (2026-09-05):** This document + `schema.sql` are the **database contract**. Older Phase 03 drafts that omitted CTV/Commission/Service are superseded.

## Conventions

| Rule | Choice |
|------|--------|
| Engine | PostgreSQL (Supabase SoR) |
| ORM / migrate | Prisma only (`prisma migrate`) |
| PK | UUID |
| Time | `timestamptz`, UTC |
| Money | `decimal(18,2)`, default currency `VND` |
| Audit | **Every table:** `created_at`, `updated_at` |
| Actor audit | `created_by_user_id` / `updated_by_user_id` on business entities (not required on pure junctions if schema omits them — junctions in DBML still have timestamps) |
| Soft delete | `deleted_at` on users, customers, contracts, document_metadata |
| Auth map | `users.auth_subject_id` UNIQUE ← Supabase Auth `sub` |
| No tables | payroll, income, debt, SePay*, multi-tenant, practice-area |

**Derived (not stored):** Order outstanding = `orders.total_gross − SUM(payments.amount WHERE verification_status ≠ VOIDED)`.

---

## 1. Identity & Access

```text
User → UserRole → Role → RolePermissionGroup → PermissionGroup → GroupPermission → Permission
```

| Table | Purpose | Key fields | Constraints |
|-------|---------|------------|-------------|
| users | Business principal | auth_subject_id, email, display_name, status | auth_subject_id UNIQUE; status enum |
| roles | Named role | code, name | code UNIQUE |
| permissions | Capability | code (`resource.action`) | code UNIQUE |
| permission_groups | Bundle | code, name | code UNIQUE |
| user_roles | M:N | user_id, role_id | UNIQUE(user_id, role_id) |
| role_permission_groups | M:N | role_id, permission_group_id | UNIQUE pair |
| group_permissions | M:N | permission_group_id, permission_id | UNIQUE pair |

**user_status:** INVITED | PENDING_APPROVAL | ACTIVE | SUSPENDED | DEACTIVATED.  
`PENDING_APPROVAL` = user Google lần đầu, chưa có role, chờ admin duyệt.

PermissionGroup path is **LOCKED** by schema (no direct Role→Permission table).

---

## 2. CRM

| Table | Purpose | Key fields / FK | Notes |
|-------|---------|-----------------|-------|
| leads | Prospect | source, status (text); owner_id; converted_customer_id UNIQUE | Lead ≠ Customer |
| customers | Client | type enum; owner_id NOT NULL; industry_or_field | Exactly one owner |
| contacts | Person | customer_id?, lead_id? | May exist before convert |
| customer_followers | Followers | customer_id, user_id | UNIQUE pair |
| notes | Notes | subject_type, subject_id, content | Polymorphic |
| activities | Timeline | subject_type, subject_id | Unified CRM/Legal |
| import_batches / import_rows | Excel import | → resulting_lead_id | No unique phone/email |

**customer_type:** INDIVIDUAL | COMPANY.

---

## 3. Service

| Table | Purpose | Notes |
|-------|---------|-------|
| services | Catalog | code UNIQUE; unit_price informational; **Order stores agreed value**, not service list price |

---

## 4. Collaboration / CTV

| Table | Purpose | Notes |
|-------|---------|-------|
| collaborators | CTV profile | user_id UNIQUE; status ACTIVE/INACTIVE |
| collaborator_customers | Assigned customers | UNIQUE(collaborator_id, customer_id) |
| contract_requests | CTV → staff approval | status enum; reviewed_by; approved_contract_id |

**contract_request_status:** DRAFT | SUBMITTED | IN_REVIEW | NEEDS_INFO | APPROVED | REJECTED.

CTV must not self-approve (application rule). Restricted data scope (OWN / assigned).

---

## 5. Legal Operation

| Table | Purpose | Notes |
|-------|---------|-------|
| contracts | Legal agreement | customer_id; **status ≠ workflow stage** |
| workflow_templates | Config | is_active |
| workflow_stages | Kanban columns | **rows**, UNIQUE(template_id, sort_order) |
| stage_requirements | Gates | type text + config_json |
| workflow_instances | Runtime | contract + template + current_stage |
| tasks | Work items | contract_id; assignee optional |
| document_metadata | Files | contract_id and/or order_id; storage_key |

**contract_status:** DRAFT | REVIEW | WAITING_CUSTOMER | SIGNED | IN_PROGRESS | COMPLETED | CANCELLED.

**NEEDS CHANGE:** Enforce uniqueness of `contract_number` among non-deleted rows (Prisma: unique + soft-delete strategy).

---

## 6. Finance

### Order

Operational/financial transaction. **stage** and **channel** and **approval_status** are **text** (configurable), not PG enums.

Key FKs: contract_id, customer_id, service_id, collaborator_id?, assigned_user_id, submitter_user_id, reviewer_user_id?.

Money: value, collaborator_price?, total_net, vat_rate (default 10), total_gross, currency VND.

Dates: deadline, vat_issue_deadline, service_start, service_end.

JSON: pending_transition, approval_history.

**OPEN:** `orders.contract_number` (integer) vs `contracts.contract_number` (text).

### Payment schedule / payment

- payment_schedules: 1:1 order  
- payment_schedule_lines: amounts + due_date  
- payments: order_id (not unique); schedule_line_id optional; method enum; verification_status enum; provider*

**payment_method:** CASH | BANK_TRANSFER | QR_PAYMENT  
**payment_verification_status:** RECORDED | VERIFIED | VOIDED

### VAT

vat_invoices: order_id; payment_id **nullable**; status DRAFT|ISSUED|CANCELLED; issue_date nullable when DRAFT; invoice_number UNIQUE.

Cardinality Payment↔Invoice: **not forced 1:1**.

### Expense (Chi)

Always `order_id`. Status PENDING|APPROVED|REJECTED. `ctv_related` flag. Approval = business command.

### Commission

Based on **collected payment** (`payment_id` preferred; `base_amount` from payment). Status PENDING|CALCULATED|APPROVED|PAID|CANCELLED. Links order, optional collaborator / beneficiary_user.

---

## 7. Communication & System

| Table | Purpose |
|-------|---------|
| notifications | In-app; recipient_user_id; source_type/id; read_at |
| reminders | remind_at; status PENDING/completed |
| outbound_email_logs | MailPort attempts |
| app_config | key PK; value_json (e.g. order.expiryAlertMonths) |

---

## 8. Enum vs configurable data

| Concept | Representation |
|---------|----------------|
| Contract lifecycle | PG/Prisma **enum** |
| Workflow / Order stage | **text / rows** |
| Payment method / verification | **enum** |
| Invoice / Expense / Commission / ContractRequest / Collaborator / User / Customer type | **enum** |
| Lead status / source / Order channel / approval_status | **text** |
| Permissions | **table rows** |

---

## 9. Cross-domain sketch

```text
User
 └─ Customer (owner) ─ Contact
 └─ Collaborator ─ collaborator_customers ─ Customer
Customer ─ Contract ─ WorkflowInstance ─ Stage / Task
Contract ─ Order ─ Service
Order ─ PaymentSchedule ─ Lines
Order ─ Payment ─ (optional) VatInvoice
Order ─ Expense
Order ─ Commission (via Payment)
Collaborator ─ ContractRequest ─ (staff) → Contract
```
