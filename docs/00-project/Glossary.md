# Glossary — DYN CRM

> Vietnamese version: [Glossary.vi.md](./Glossary.vi.md)

## 1. Purpose

Establish **canonical English terms** (and Vietnamese UI equivalents where known) so code, APIs, database tables, and documents use one vocabulary.

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| Product and domain terminology | Full Vietnamese UI copy deck |
| Status and role names locked for MVP | Implementation field-level schemas |

If code and docs disagree, **this glossary wins** until formally updated.

## 3. Background

Law-firm CRM mixes CRM language (Lead, Customer) with legal (Contract) and accounting (Order, Invoice, Payment). Ambiguous naming—especially **Order vs Matter** and **Lead vs Customer**—causes schema and UI defects. Stakeholders locked **Order** (not Matter) for finance integration.

## 4. Design

### 4.1 Naming rules

| Rule | Example |
|------|---------|
| Use Glossary English in code, Prisma models, API paths | `Contract`, `Order`, `Commission` |
| Vietnamese is for MVP UI labels | map via i18n keys |
| Do not synonym-swap in the same layer | Never call Order a “Contract” in APIs |
| Status enums use PascalCase labels in docs; code may use `SCREAMING_SNAKE` | `In Progress` → `IN_PROGRESS` |

### 4.2 Core terms

| Term | Definition | Vietnamese UI (MVP hint) | Notes |
|------|------------|--------------------------|-------|
| DYN CRM | Product name | DYN CRM | Locked spelling |
| Lead | Prospective client record before Customer | Tiềm năng / Lead | **Separate entity** |
| Qualified | Lead state/process step toward conversion | Đạt chuẩn | Exact status set TBD |
| Customer | Client record: Individual or Company | Khách hàng | Has exactly one Owner |
| Individual | Customer type for a person | Cá nhân | |
| Company | Customer type for an organization | Công ty | |
| Contact | Person linked to Customer (and possibly Lead) | Liên hệ | |
| Owner | Primary responsible user for a Customer | Người phụ trách | Exactly one |
| Follower | Additional user following a Customer | Người theo dõi | Optional, many |
| Contract | Legal agreement with Customer | Hợp đồng | Not a financial ledger entry |
| Order | Financial transaction generated from a Contract | Đơn hàng / Order | **Do not rename to Matter** |
| Milestone | Billing/progress checkpoint usable for invoicing | Mốc | Invoice source |
| Invoice | Bill issued to customer | Hóa đơn | Sources: Contract, Milestone, Manual |
| Manual Invoice | Invoice created without automatic source binding constraints beyond finance rules | Hóa đơn thủ công | Still audited |
| Payment | Collected money entry | Thanh toán | Partial allowed |
| Partial Payment | Payment amount less than outstanding | Thanh toán một phần | |
| VAT | Value-added tax | Thuế GTGT | MVP: 10% exclusive |
| Exclusive VAT | Tax added on top of net amount | Chưa bao gồm thuế | Locked MVP |
| Commission | Amount calculated from collected payment | Hoa hồng | % configurable |
| Collaborator / CTV | External referral partner | CTV / Cộng tác viên | Restricted portal |
| CTV Portal | Limited app surface for CTV | Cổng CTV | Not full CRM |
| Workflow Template | Admin-defined stage configuration | Mẫu quy trình | No BPMN in MVP |
| Workflow | Instance of a template on a work context | Quy trình | |
| Task | Unit of work in a workflow | Công việc | Assignee, due date |
| Due Date | Task deadline | Hạn xử lý | |
| Reminder | Notification before/at due | Nhắc việc | |
| Assignee | User responsible for a task | Người được giao | |
| Kanban | Board view of workflow stages | Kanban | |
| Timeline / Activity | Chronological event history | Dòng thời gian / Hoạt động | |
| File | Stored object via StoragePort (MVP: Supabase Storage) | Tài liệu / File | |
| Dashboard | Aggregated operational view | Bảng điều khiển | |
| Notification | In-app alert | Thông báo | |
| Configuration | System settings | Cấu hình | |
| Role | Named RBAC role | Vai trò | See role list |
| Permission | Fine-grained authorization unit | Quyền | |
| Modular Monolith | Deployable unit with internal module boundaries | — | Architecture style |
| Single-tenant | One firm per deployment | — | MVP |
| Multi-tenant ready | Designed for future tenant isolation | — | Not MVP feature |

### 4.3 Contract statuses (locked labels)

| Status | Code (recommended) | Meaning |
|--------|--------------------|---------|
| Draft | `DRAFT` | Internal drafting |
| Review | `REVIEW` | Internal review |
| Waiting Customer | `WAITING_CUSTOMER` | Awaiting customer action |
| Signed | `SIGNED` | Agreement signed |
| In Progress | `IN_PROGRESS` | Delivery underway |
| Completed | `COMPLETED` | Finished successfully |
| Cancelled | `CANCELLED` | Terminated / abandoned |

### 4.4 Roles (locked)

| Role | Code (recommended) |
|------|--------------------|
| Super Admin | `SUPER_ADMIN` |
| Admin | `ADMIN` |
| Manager | `MANAGER` |
| Lawyer | `LAWYER` |
| Legal Assistant | `LEGAL_ASSISTANT` |
| Accounting | `ACCOUNTING` |
| Sales | `SALES` |
| Collaborator (CTV) | `COLLABORATOR` |

### 4.5 Payment methods (MVP)

| Term | Code (recommended) |
|------|--------------------|
| Cash | `CASH` |
| Bank Transfer | `BANK_TRANSFER` |
| QR Payment | `QR_PAYMENT` |

### 4.6 Finance chain (canonical phrase)

**Contract → Order → Payment Schedule → Payment → Debt → VAT Invoice → Commission**

(Invoice is issued **after** Payment.)

### 4.7 Terms explicitly rejected / avoided

| Avoid | Use instead | Reason |
|-------|-------------|--------|
| Matter (as Order replacement) | Order | Stakeholder lock for accounting alignment |
| Deal (ambiguous) | Lead / Contract as appropriate | Unclear stage |
| Client (in code) | Customer | Consistency (UI may say khách hàng) |
| Partner (ambiguous) | Collaborator / CTV | Avoid confusion with law partners |

## 5. Business Rules

1. New terms require Glossary update before merge of APIs using those terms.
2. Enum codes in section 4 are **recommended**; final Prisma enums confirmed in `03-database/`.
3. Vietnamese labels may be refined by UX without changing English canonical terms.
4. Lead must never be stored only as a Customer status in MVP (separate entity rule).

## 6. Best Practices

- Add Prisma model names matching Glossary (`Customer`, `Lead`, `Contract`, `Order`).
- API paths: `/customers`, `/leads`, `/contracts`, `/orders`, `/invoices`, `/payments`.
- i18n keys: `customer.owner`, `contract.status.in_progress`, etc.
- In PRs, reject silent synonym introductions.

## 7. Examples

**Good API:** `POST /contracts/{id}/orders` — creates Order from Contract.  
**Bad API:** `POST /matters` — violates locked naming.  
**Good UI:** Vietnamese label “Hợp đồng” bound to entity `Contract`.  
**Bad model:** `Customer.status = LEAD` as the only Lead representation.

## 8. Future Improvements

| Item | Notes |
|------|-------|
| Complete VI copy deck | Phase 2 alongside English UI |
| Practice-area terms | When those modules are scoped |
| Gateway provider terms | VNPay, MoMo, Stripe |
| Tenant / Organization terms | Multi-tenant phase |

## 9. References

- `Scope.md`
- `Business.md`
- Stakeholder decisions 2026-08-02

---

## Suggested related documents

- `Business.md` — how terms interact in value streams
- `02-domain/*.md` — per-entity rules (Phase 02)
- `04-development/APIConvention.md` — path naming (Phase 04)
- `03-database/NamingConvention.md` — table/column names (Phase 03)

## TODO

- [ ] Confirm final Vietnamese labels with product owner (table 4.2 hints)
- [ ] Confirm Lead status enum beyond “Qualified” concept
- [ ] Confirm Order Vietnamese label (Đơn hàng vs alternative firm language)
- [ ] Confirm Contact relationship cardinality rules in domain docs
