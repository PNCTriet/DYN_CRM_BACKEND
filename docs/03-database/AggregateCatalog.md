# Aggregate catalog — Phase 03 (database-oriented)

> Vietnamese version: [AggregateCatalog.vi.md](./AggregateCatalog.vi.md)  
> Logical schema: [SchemaDesign.md](./SchemaDesign.md)

This catalog is the **database-oriented** expansion of Phase 02 §15. No Prisma DSL. **Collaboration is excluded.**

Column legend: **R** = required in draft · **O** = optional · **OPEN** = do not freeze.

---

## 1. Identity

| Item | Definition |
|------|------------|
| Aggregate | **User** (principal) + **RBAC catalog** (Role, Permission, PermissionGroup) |
| Root | `User` |
| Main entities | User, Role, Permission, PermissionGroup, UserRole, RolePermissionGroup, GroupPermission |
| Ownership | Identity module |
| Relates to | Every other aggregate via `userId` only |
| Required FKs | UserRole.userId → User; UserRole.roleId → Role; RolePermissionGroup.roleId → Role; RolePermissionGroup.permissionGroupId → PermissionGroup; GroupPermission.permissionGroupId → PermissionGroup; GroupPermission.permissionId → Permission |
| Cross-domain | None outbound. Inbound: Owner, Follower, Assignee, Actor, Approver |
| Constraints | `User.authSubjectId` UNIQUE; `Permission.code` UNIQUE (`resource.action`); deactivated User cannot act |
| Schema-critical OPEN | Is **PermissionGroup mandatory**, or may Role attach Permission directly? `COLLABORATOR` role seed? How is Chi approver “Nhi” represented? |

**Auth mapping:** Supabase Auth `sub` → `User.authSubjectId`. Business FKs use `User.id`, never the IdP object.

**PermissionGroup assumption (not LOCKED):** Draft **includes** the Group path because Phase 02 recommends it for admin UX (`Permission → Group → Role → User`). Direct `RolePermission` is **not** in the first draft; add later if groups are optional.

---

## 2. CRM

| Item | Definition |
|------|------------|
| Aggregates | **Lead**, **Customer**, **ImportBatch** |
| Roots | Lead, Customer, ImportBatch |
| Main entities | Lead, Customer, Contact, CustomerFollower, Note, Activity, ImportBatch, ImportRow |
| Ownership | CRM module |
| Relates to | Identity (Owner/Follower/assignee); Legal (Customer ← Contract); Finance (Customer on Order) |
| Required FKs | Customer.ownerId → User; CustomerFollower.customerId → Customer; CustomerFollower.userId → User; Contact.customerId → Customer; Lead.convertedCustomerId → Customer (O, after convert); ImportBatch createdBy → User |
| Cross-domain | Customer.id referenced by Contract, Order |
| Constraints | Lead ≠ Customer (separate tables); Customer.type mandatory; exactly one Owner; **no** unique(name/phone/email) until duplicate policy locks |
| Schema-critical OPEN | Lead status set; duplicate match keys; convert field map; Contact-on-Lead; industry catalog vs free text; extra Customer date meaning; “used service” derivation |

**Used service:** **derive** from existence of Contract and/or Order/Payment — no denormalized flag in this draft. Exact rule OPEN.

**Customer extra date:** **no column** until meaning is locked.

---

## 3. Legal

| Item | Definition |
|------|------------|
| Aggregates | **Contract**, **WorkflowTemplate**, **WorkflowInstance**, **Task**, **DocumentMetadata** |
| Roots | Contract; WorkflowTemplate; WorkflowInstance (bound to Contract); Task; DocumentMetadata |
| Main entities | Contract, WorkflowTemplate, WorkflowStage, StageRequirement, WorkflowInstance, Task, DocumentMetadata, LegalActivity |
| Ownership | Legal module |
| Relates to | CRM Customer; Identity (actors); Finance (Contract ← Order); Communication (events) |
| Required FKs | Contract.customerId → Customer; WorkflowStage.templateId → WorkflowTemplate; StageRequirement.stageId → WorkflowStage; WorkflowInstance.contractId → Contract; WorkflowInstance.templateId → WorkflowTemplate; WorkflowInstance.currentStageId → WorkflowStage; Task.contractId or instanceId; DocumentMetadata.contractId |
| Cross-domain | Contract.id referenced by Order |
| Constraints | `Contract.contractNumber` UNIQUE (partial unique if soft-deleted); duplicate number **rejected** at DB |
| Schema-critical OPEN | Kanban columns = WorkflowStage **or** Contract Status? Contract number manual vs generated; multi-instance per Contract; Cancelled matrix (does not add tables) |

**Draft distinction (survives the OPEN question):**

- `Contract.status` = Glossary lifecycle (closed set **today**).
- `WorkflowStage` = **rows** (Kanban columns). Never a Prisma enum.

If stakeholders later say Kanban **is** Contract Status, `Contract.status` becomes a FK to a status catalog — **do not** implement that now.

---

## 4. Finance

| Item | Definition |
|------|------------|
| Aggregates | **Order**, **Payment**, **VatInvoice**, **Expense** (draft) |
| Roots | Order (owns schedule); Payment; VatInvoice; Expense |
| Main entities | Order, PaymentSchedule, PaymentScheduleLine, Payment, VatInvoice, Expense |
| **Not in core draft** | Commission table; Income table; Debt table; SePay* tables; Collaboration tables |
| Ownership | Finance module |
| Relates to | Legal Contract; CRM Customer (via Contract or optional denormalized customerId); Identity; Communication (events only) |
| Required FKs | Order.contractId → Contract; PaymentSchedule.orderId → Order; Payment.orderId → Order; VatInvoice.orderId → Order; Expense created/approved by User |
| Cross-domain | Order emits expiry; Invoice emits issued — Communication consumes, no FK from Finance to Notification |
| Constraints | Money DECIMAL; VND; Payment must not exceed outstanding **in application** (Debt model OPEN); Invoice **after** Payment is a **use-case rule**, not a single FK shape |
| Schema-critical OPEN | Order status set; serviceStart/End required?; Expired status; extend?; N global vs per-Order; Debt stored vs derived; Payment→Invoice cardinality; Invoice due date; Expense vs note for CTV; Commission keep/drop; SePay persist shape beyond opaque provider fields |

**Income/Expense direction: ASSUMPTION (not LOCKED)** — Option A from Finance §25:

- **Thu** = query over Payment (and issued invoices as context) — **no Income table**.
- **Chi** = explicit `Expense` rows (approval required), including CTV-related spend/note fields.
- Do **not** insert a second Income row when a Payment is recorded.

**Debt: OPEN** — no `Debt` table in this draft; remaining balance is **derived** (`Order total − sum(payments)`) until stored balance is locked.

**Commission: OPEN / isolated** — no table in core schema. Add later without redesigning Order/Payment.

---

## 5. Communication

| Item | Definition |
|------|------------|
| Aggregates | **Notification**, **Reminder** (optional persist), **OutboundEmailLog** |
| Roots | Notification |
| Main entities | Notification, Reminder, OutboundEmailLog |
| Ownership | System / Communication module |
| Relates to | Identity (recipient); generic source type+id to CRM/Legal/Finance records |
| Required FKs | Notification.recipientUserId → User |
| Cross-domain | No FK **from** Finance/Legal into Communication tables |
| Constraints | No marketing; no secrets in body |
| Schema-critical OPEN | Persist Reminder vs job-only? InvoiceDueSoon/Overdue need due date on invoice (Finance OPEN) |

**AppConfig** (system): key/value for global expiry **N months**, VAT rate, mail flags. Not an Order column.

---

## 6. Intentionally absent

| Model | Why |
|-------|-----|
| CollaboratorProfile, ContractRequest, ReferralAttribution, AssignedCustomer | S6 SUPERSEDED |
| Commission | Not assumed after 2026-08-17 |
| Income / FinancialTransaction ledger | Would duplicate Payment unless locked |
| Debt | Representation OPEN |
| SepayPayment / SepayTransaction | PaymentProviderPort + opaque Payment.provider* only |
| Organization / Department tables | Extension point only — nullable later, not MVP tables |
| Customer extra date column | Meaning OPEN |
| “hasUsedService” flag | Prefer derive |
