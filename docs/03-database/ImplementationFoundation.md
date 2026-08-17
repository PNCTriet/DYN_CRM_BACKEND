# Implementation foundation — Supabase + NestJS contracts

> Vietnamese version: [ImplementationFoundation.vi.md](./ImplementationFoundation.vi.md)

No application code in this document. Contracts only.

## 1. Goal

Start Identity/RBAC and persistence from the Phase 03 draft ([SchemaDesign.md](./SchemaDesign.md)). Finance Prisma stays behind schema-critical locks. No CTV portal or SePay SDK in the domain.

## 2. Supabase

| Concern | Contract |
|---------|----------|
| PostgreSQL | System of record; Prisma only |
| Auth | IdP. Clients authenticate through **NestJS BFF**, not Supabase JS for business APIs |
| Auth subject → User | Store provider user id on Identity `User` (unique). Disabled User cannot act even if IdP session exists |
| Storage | StoragePort. Production: existing Supabase Storage adapter unless re-locked. Local: MinIO adapter allowed |
| RLS | Not the authorization source of truth (Phase 01). NestJS RBAC owns permissions |

## 3. NestJS modular monolith

| Area | Contract |
|------|----------|
| Style | DDD-lite modules: Identity, CRM, Legal, Finance, System (Communication/Dashboard/Config) |
| Layers | Application (use cases) → Domain (invariants/events) → Infrastructure (Prisma repos, ports) |
| Prisma | Repositories in infrastructure; no Prisma types on module public APIs |
| RBAC | Guards + `resource.action`; unknown permission ⇒ deny |
| Config | Env + AppConfig for N-month expiry, feature flags (SePay on/off) |
| Queue | QueuePort / BullMQ worker for mail, reminders, expiry/invoice alerts |
| Payment | PaymentProviderPort; SePay adapter **behind the port** if MVP |

Do **not** add a Collaboration NestJS module until S6 is reversed.

## 4. First vertical slices (after schema baseline)

1. Monorepo + NestJS + Prisma migrate (Identity tables)  
2. Auth BFF + User mapping + RBAC guard  
3. CRM Lead/Customer slice  
4. Legal Contract (unique number) + configurable stages  
5. Finance Order/Payment/Invoice  

## 5. Docker Compose (local)

Allowed for Redis, MinIO, and optionally local Postgres **if** not using remote Supabase in dev. Production topology remains Phase 01 (Vercel + Railway + Supabase) unless Deployment is re-locked.
