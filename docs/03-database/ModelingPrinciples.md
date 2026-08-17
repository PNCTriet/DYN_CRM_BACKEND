# Database modeling principles — DYN CRM

> Vietnamese version: [ModelingPrinciples.vi.md](./ModelingPrinciples.vi.md)

## 1. Purpose

Define the **schema contract** for Phase 03 so Prisma migrations can be written without inventing business rules. This is not the Prisma schema.

## 2. Scope

| In | Out |
|----|-----|
| Modeling principles and constraints | `.prisma` file, SQL DDL, NestJS modules |
| Aggregate → table *intent* | REST DTOs, controllers |

## 3. Principles

1. One modular monolith, one PostgreSQL database (Supabase). Prisma is the only persistence path (ADR-002). Logical model: [`SchemaDesign.md`](./SchemaDesign.md).  
2. Tables follow Glossary English names (`Customer`, `Lead`, `Contract`, `Order`).  
3. Cross-domain references are **IDs only** (no leaked Prisma types across module facades).  
4. Do not persist a Collaboration/CTV portal model unless Scope S6 is reversed.  
5. User-configurable values (Kanban columns / workflow stages, permission catalogs, expiry N) are **rows**, not Prisma enums.  
6. Lifecycle labels that stakeholders lock as a closed set *may* be Prisma enums (e.g. Contract Status **if** they remain Glossary-locked). If Kanban columns *are* Contract Statuses, that is a **rule change** — then statuses become data.  
7. Money: `DECIMAL`/`Numeric` for VND amounts; no float. Currency code default VND.  
8. Date/time: timestamptz in UTC; date-only fields (validity, “customer date” once defined) as `date` when time-of-day is irrelevant.  
9. Audit: `createdAt`, `updatedAt`, `createdByUserId` / `updatedByUserId` on aggregates that staff mutate.  
10. Soft delete: prefer `deletedAt` on masters that must not vanish from history (Customer, Contract). Hard delete only for draft/import junk with no references.  
11. Unique constraints in the database: **contract number**; permission `code`; email/auth subject as Identity requires. Application checks are not enough.  
12. Indexes: FKs, status + owner filters, contract number, customer search keys (once duplicate policy is locked).  
13. Required vs nullable: do not mark the unspecified Customer date NOT NULL. Order start/end requiredness is **OPEN**.  
14. Configuration: key/value or typed config table for global N (expiry months), VAT rate (fixed 10% MVP may still be config). Per-Order N is OPEN.  
15. Notifications/reminders: persist Notification; Reminder may be a row **or** a scheduled job reading source dates — OPEN (Communication).  
16. Auth: Supabase Auth `sub` maps 1:1 to Identity `User` (see ImplementationFoundation).  
17. Migrations: Prisma migrate; never edit production schema by hand. Expand-then-contract for enum changes.  
18. Payment provider: store opaque `provider`, `providerPaymentId`, `providerStatus` — not SePay payloads as domain columns.

## 4. Enum candidates (only if closed sets)

| Candidate | Use Prisma enum? |
|-----------|------------------|
| Customer type Individual/Company | Yes (locked) |
| Contract Status | **Yes only if** Glossary labels stay locked — **No** if Kanban columns *are* statuses |
| Workflow Stage / Kanban column | **No** — configurable data |
| Lead status | After lock |
| Order status | After lock |
| Payment method | Yes (Cash, Bank Transfer, QR) — SePay is a **provider**, not necessarily a method enum value until locked |
| Payment verification state | After lock (Recorded/Verified/Voided is a working assumption) |
| User status | Yes (Active/Suspended/Deactivated) |
| Permission code | String unique catalog, not an enum of all permissions |

## 5. Soft delete vs uniqueness

Unique contract number must still apply among **non-deleted** rows (partial unique index) if soft delete is used. Same for permission codes.

## 6. References

- Domain aggregates: each `02-domain/*` §15  
- Open questions: [`OVERVIEW.md`](../../OVERVIEW.md)  
