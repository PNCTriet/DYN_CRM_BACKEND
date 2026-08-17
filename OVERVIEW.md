# DYN CRM — Project Overview

> Updated: **2026-08-17** — stakeholder re-lock in progress; Phase 03 Database is next.

English is canonical for `docs/`. This overview is the project status board.

---

## Current Status

| Phase | Status |
|-------|--------|
| 00 — Project | **LOCKED** (except explicit 2026-08-17 scope-change rows) |
| 01 — Architecture | **LOCKED** (Modular Monolith + DDD-lite; ports unchanged) |
| 02 — Domain | **BASELINE COMPLETE / RE-LOCKING STAKEHOLDER CHANGES** |
| 03 — Database | **DRAFT SCHEMA CONTRACT** — [`docs/03-database/SchemaDesign.md`](./docs/03-database/SchemaDesign.md) |
| 04 — Development | **AFTER DATABASE BASELINE** — vertical slices, not a second docs project |

Not all Open Questions must be closed before any code. Distinguish **schema-critical** vs **non-schema-critical**.

---

## Scope changes recorded 2026-08-17

These **override** the 2026-08-03 CTV Collaboration expansion until stakeholders re-confirm otherwise. Do not implement the old CTV portal.

| ID | Stakeholder note | Classification | Action in docs |
|----|------------------|----------------|----------------|
| S1 | Duyệt chỉ cần duyệt chi (với Nhi) | **OPEN QUESTION** + capability confirmed (expense approval) | Finance, Identity |
| S2 | Các trạng thái của một đơn hàng | **OPEN QUESTION** (statuses requested, not enumerated) | Finance |
| S3 | Thời hạn đơn hàng + alert N tháng (N configurable) | **CONFIRMED** capability | Finance, Communication, Config |
| S4 | Bổ sung tab Chi và Thu | **SCOPE CHANGE** / capability confirmed; ledger model **OPEN** | Finance |
| S5 | Trạng thái hợp đồng / Kanban thêm cột, user được phép cấu hình | **CONFIRMED** configurable columns; **OPEN** whether columns = Workflow Stage or Contract Status | LegalOperation |
| S6 | Loại bỏ hẳn thông tin CTV; chỉ note khoản thu/chi cho CTV | **SCOPE CHANGE** (major) | Scope, Business, Glossary, Collaboration, Finance, CapabilityMap, Timeline, Module |
| S7 | Thanh toán dịch vụ SePay + invoice | **SCOPE CHANGE** (was future; now candidate MVP) | Finance, Architecture (PaymentPort) |
| S8 | Với hoá đơn cần có alert | **CONFIRMED** capability; trigger details **OPEN** | Finance, Communication |
| S9 | Trùng số hợp đồng | **CONFIRMED** invariant | LegalOperation, Phase 03 unique constraint |
| S10 | Export khách: đã dùng dịch vụ / chưa; theo lĩnh vực | **CONFIRMED** CRM operational export | CRM |
| S11 | Bổ sung ngày vào cột thông tin khách hàng | **OPEN QUESTION** (which date) | CRM |

Still valid from 2026-08-03 unless listed above:

- Invoice **after** Payment
- Modular monolith, NestJS BFF, Prisma → Supabase PostgreSQL, Supabase Auth, RBAC in NestJS

---

## Schema-critical decisions remaining

These can change **tables, relations, enums, constraints, or required/nullable fields**. Resolve before the **final** Prisma migration of the affected domain.

| # | Decision | Domain |
|---|----------|--------|
| 1 | CTV operational domain removed vs re-approved? (portal, Contract Request, assigned customers, Collaborator role) | Collaboration / Identity / Scope |
| 2 | CTV money = Expense only, Income, or free-text note? Commission object kept or dropped? | Finance |
| 3 | Income / Expense: derived views vs explicit `FinancialTransaction` rows (avoid double-posting Payment) | Finance |
| 4 | Expense approval: is “Nhi” a named user, a role, or a permission? | Finance / Identity |
| 5 | Order status set | Finance |
| 6 | Order validity: start/end on Order vs Contract; expired status; extend allowed? | Finance |
| 7 | Expiration alert: global `N` months vs per Order | Finance / Config |
| 8 | Debt stored vs derived | Finance |
| 9 | Payment → Invoice 1:1 vs N:1; invoice due date exists? | Finance |
| 10 | SePay MVP boundary (initiate / detect / verify / webhook) | Finance / Architecture |
| 11 | Kanban columns = Workflow Stages (data) vs Contract lifecycle statuses (today Glossary-locked) | Legal |
| 12 | Contract number: manual vs generated (uniqueness is locked) | Legal |
| 13 | Contract Cancelled matrix; Completed vs Workflow | Legal |
| 14 | Customer industry/field catalog; “has used service” derivation | CRM |
| 15 | Customer extra date field meaning | CRM |
| 16 | Lead status enum; duplicate policy; convert field map | CRM |
| 17 | Permission Group modeling; `COLLABORATOR` role retained? | Identity |

---

## Non-schema-critical decisions

Can stay documented and close during vertical-slice implementation.

- In-app vs email for each alert
- Invoice overdue vs due-soon only; who receives invoice/expiry alerts
- Dashboard widget list
- Reminder lead time for tasks (e.g. 24h)
- Email template copy
- Real-time transport (polling vs websocket)
- Document retention / versioning policy
- E-invoice (HĐĐT) authority integration
- Void/refund/credit-note operating procedure (once the data model allows a correction path)
- Owner vs Follower exact UI write matrix (once Owner is required)

---

## Immediate next steps

1. Re-lock stakeholder changes (especially **S6 CTV** and **S4 Thu/Chi**).
2. Finalize schema-critical domain rules listed above.
3. Review Phase 03 [`SchemaDesign.md`](./docs/03-database/SchemaDesign.md) (**YES, except Finance** for starting Prisma).  
4. Setup Supabase PostgreSQL + Auth.  
5. Setup Prisma **Identity → CRM → Legal** (strings for unlocked statuses).  
6. Re-lock Finance schema-critical questions, then Finance Prisma.  
7. Setup NestJS modular monolith foundation (ports, RBAC guards, config).  
8. Identity / RBAC vertical slice.  
9. CRM vertical slice.  
10. Legal → Finance slices (after schema-critical Finance/Legal locks).

Do **not** start Prisma models for Collaboration/CTV portal until S6 is re-locked.

---

## Entry points

- Phase 00: [`docs/00-project/Scope.md`](./docs/00-project/Scope.md)
- Phase 02: [`docs/02-domain/README.md`](./docs/02-domain/README.md)
- Phase 03: [`docs/03-database/README.md`](./docs/03-database/README.md)
