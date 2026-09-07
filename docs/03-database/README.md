# Phase 03 — Database Index

> Vietnamese: [README.vi.md](./README.vi.md)

## Status

**DATABASE CONTRACT (2026-09-05).** Authoritative sources:

1. [`schema.sql`](./schema.sql) (DBML)  
2. [`SchemaDesign.md`](./SchemaDesign.md)  
3. [`DbReview.md`](./DbReview.md)  
4. [`TraceabilityMatrix.md`](./TraceabilityMatrix.md)

| Other docs | Role |
|------------|------|
| [ModelingPrinciples.md](./ModelingPrinciples.md) | Conventions |
| [AggregateCatalog.md](./AggregateCatalog.md) | Aggregate map (align to schema) |
| [ImplementationFoundation.md](./ImplementationFoundation.md) | NestJS / Supabase contracts |

## Domains in DB

Identity · CRM · Service · Collaboration · Legal · Finance · Communication · System  

**No:** payroll, income, debt table, SePay-specific, multi-tenant.

## Prisma

Generate from this contract. Use `prisma migrate`. Add **unique** on `contracts.contract_number` (soft-delete aware) — see DbReview NEEDS CHANGE.
