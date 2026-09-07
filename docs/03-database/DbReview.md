# Database Review — schema.sql (DBML) vs documentation

> Date: **2026-09-05**  
> Source file: [`schema.sql`](./schema.sql) (DBML format, not raw PostgreSQL DDL)  
> Priority: Scope + **this schema** override superseded Phase 02 notes (esp. 2026-08-17 CTV removal).

## Summary

| Verdict | Count (approx.) |
|---------|-----------------|
| VALID | Most Identity, CRM, Legal, Payment, Communication tables |
| NEEDS CHANGE | Soft-delete unique on `contracts.contract_number`; clarify `orders.contract_number` type |
| OPEN DECISION | Several (see below) |

**Major scope reconciliation:** The schema **reintroduces Collaboration/CTV** (`collaborators`, `collaborator_customers`, `contract_requests`) and **Commission**. Documentation that marked CTV portal as SUPERSEDED (2026-08-17) is **superseded by this schema contract**. Docs must be updated accordingly.

**Explicit non-tables (VALID omit):** payroll, income, debt, SePay-specific, multi-tenant, practice-area.

---

## Table review

| DB table | Domain | Purpose | Relationships | Potential issue | Action |
|----------|--------|---------|---------------|-----------------|--------|
| users | Identity | Business user; Auth subject map | ← many FKs | — | **VALID** |
| roles | Identity | Named role | user_roles, role_permission_groups | — | **VALID** |
| permissions | Identity | `resource.action` | group_permissions | — | **VALID** |
| permission_groups | Identity | Permission bundles | role_permission_groups, group_permissions | Group path is now **schema-locked** | **VALID** |
| user_roles | Identity | User↔Role | users, roles | — | **VALID** |
| role_permission_groups | Identity | Role↔Group | roles, permission_groups | — | **VALID** |
| group_permissions | Identity | Group↔Permission | permission_groups, permissions | — | **VALID** |
| leads | CRM | Prospect before Customer | owner→users, converted→customers | status/source as text (not enum) intentional | **VALID** |
| customers | CRM | Client master; one owner | owner→users | No unique phone/email (correct until duplicate policy) | **VALID** |
| contacts | CRM | People on Customer and/or Lead | customer nullable, lead nullable | At least one of customer_id/lead_id should be enforced in app | **OPEN DECISION** (app check vs CHECK constraint) |
| customer_followers | CRM | M:N followers | customers, users | — | **VALID** |
| notes | CRM | Polymorphic notes | subject_type/id | — | **VALID** |
| activities | CRM/Legal | Unified timeline | subject_type/id | Replaces separate LegalActivity | **VALID** |
| import_batches / import_rows | CRM | Excel import | → leads | — | **VALID** |
| services | Service | Service catalog | ← orders | unit_price ≠ order value (doc rule) | **VALID** (new domain) |
| collaborators | Collaboration | CTV profile | user_id unique → users | Restores CTV vs 2026-08-17 docs | **VALID** (scope re-lock) |
| collaborator_customers | Collaboration | Assigned customers | collaborators, customers | Scoped CTV access | **VALID** |
| contract_requests | Collaboration | CTV request → staff approve | collaborator, optional customer/lead, approved_contract | Staff must approve; CTV cannot self-approve (app) | **VALID** |
| contracts | Legal | Legal agreement | customer | Index on contract_number but **no UNIQUE**; soft-delete needs partial unique | **NEEDS CHANGE** |
| workflow_templates / stages / stage_requirements | Legal | Configurable Kanban | stages as rows | Stages not enums — correct | **VALID** |
| workflow_instances | Legal | Instance on contract | contract, template, current_stage | Multi-instance allowed | **VALID** |
| tasks | Legal | Assignable work | contract, optional instance | status text | **VALID** |
| document_metadata | Legal/Finance | File metadata | contract and/or order | Both FKs nullable — app should require one | **OPEN DECISION** |
| orders | Finance | Operational/financial txn | contract, customer, service, optional collaborator | Rich fields; stage text; `contract_number` **integer** vs contracts.text | **OPEN DECISION** (VAT workflow number semantics) |
| payment_schedules / lines | Finance | Installment plan | 1:1 order | — | **VALID** |
| payments | Finance | Collected money | order; optional schedule_line | Partial payments OK; provider* opaque | **VALID** |
| vat_invoices | Finance | VAT after payment (rule in app) | order; optional payment | issue_date nullable for DRAFT — correct | **VALID** |
| expenses | Finance | Chi scoped to Order | order | PENDING/APPROVED/REJECTED | **VALID** |
| commissions | Finance | From collected payment | order, optional payment, collaborator | Restored; base = collected payment | **VALID** (scope re-lock) |
| notifications / reminders / outbound_email_logs | Communication | Alerts / email log | recipient user | — | **VALID** |
| app_config | System | Key/value config | — | Expiry N months etc. | **VALID** |

---

## Conflicts vs prior docs

| Topic | Prior docs (2026-08-17) | schema.sql | Resolution |
|-------|-------------------------|------------|------------|
| CTV portal / Contract Request | SUPERSEDED / removed | Tables present | **Schema wins** — restore Collaboration in Scope/Domain |
| Commission | Optional / OPEN | `commissions` table | **Schema wins** — Commission in MVP |
| Service master | Not in Phase 02 | `services` | **Add** Service domain |
| Income / Debt tables | Omit | Omit | Aligned — debt **derived** |
| SePay tables | Omit | Opaque `provider*` on payments | Aligned |
| PermissionGroup | OPEN | Tables present | **LOCKED** by schema |
| Order status enum | OPEN | `stage` text | Aligned — configurable, not PG enum |
| Contract status | Glossary enum | `contract_status` enum | Aligned |
| Payment verification | Working assumption | Enum RECORDED/VERIFIED/VOIDED | **LOCKED** by schema |
| Expense status | OPEN | Enum PENDING/APPROVED/REJECTED | **LOCKED** by schema |
| Invoice status | OPEN | Enum DRAFT/ISSUED/CANCELLED | **LOCKED** by schema |
| Customer extra date | OPEN | No column | Still **OPEN** / not in schema |
| Contract number uniqueness | Locked unique | Index only, not unique | **NEEDS CHANGE** in DDL/Prisma |

---

## OPEN DECISIONS (do not invent)

1. **Partial unique** on `contracts.contract_number` where `deleted_at IS NULL`.  
2. Meaning of `orders.contract_number` (integer) vs `contracts.contract_number` (text).  
3. Contact must have customer_id OR lead_id (DB CHECK vs app-only).  
4. Document_metadata must attach to contract and/or order.  
5. VAT rate flexibility on order/invoice vs fixed 10% MVP — schema allows `vat_rate` column; product still says 10% exclusive MVP.  
6. Exact Order stage catalog values (stored as text).  
7. Global vs per-order expiry alert N (config only).  
8. Duplicate Lead/Customer match keys.  
9. Whether `needs_vat` + draft invoice flow requires Payment before DRAFT or only before ISSUE.

---

## Action list

1. Treat [`schema.sql`](./schema.sql) as DB contract candidate.  
2. Rewrite [`SchemaDesign.md`](./SchemaDesign.md) to match.  
3. Restore Collaboration / CTV / Commission in Scope + domain docs; add Service.  
4. Add unique (partial) on contract_number in Prisma.  
5. NestJS foundation + Customer vertical slice.
