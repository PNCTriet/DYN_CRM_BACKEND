# Implementation foundation — Supabase + NestJS contracts

> Vietnamese version: [ImplementationFoundation.vi.md](./ImplementationFoundation.vi.md)

Application code lives under `apps/backend`. This document remains the technical contract summary.

## 1. Goal

Start Identity/RBAC and persistence from the Phase 03 DB contract ([SchemaDesign.md](./SchemaDesign.md), [schema.sql](./schema.sql)). Authorization: [Authorization.md](../04-development/Authorization.md). Collaboration/CTV and Commission are **in scope** per the current DB contract (reintroduced 2026-09). No Payroll / Debt table / SePay-specific tables in MVP.

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
| Style | DDD-lite modules: `identity`, `crm`, `service`, `collaboration`, `legal`, `finance`, `communication`, `system` |
| Layers | `presentation` → `application` → `domain` → `infrastructure` (Prisma repos) |
| API | Global prefix `/api/v1` |
| Prisma | Repositories in infrastructure; no Prisma types on HTTP responses |
| RBAC | AuthGuard → RbacGuard + `@RequirePermission` → Resource Policy (scope) |
| Config | Env + `app_config` for flags |
| Queue | QueuePort / BullMQ worker for mail, reminders (later) |
| Payment | PaymentProviderPort only if gateway integration is re-locked |

## 4. Implementation order

1. Foundation (bootstrap, Prisma, Auth/RBAC/policy) — **done in scaffold**  
2. Identity management APIs  
3. CRM Customer vertical slice — **first slice**  
4. Lead / Contact / Followers / Notes / Activities / Import  
5. Service → Legal → Finance → Collaboration → Communication/System 

## 5. Docker Compose (local)

Allowed for Redis, MinIO, and optionally local Postgres **if** not using remote Supabase in dev. Production topology remains Phase 01 (Vercel + Railway + Supabase) unless Deployment is re-locked.
