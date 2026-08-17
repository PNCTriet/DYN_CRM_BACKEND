# Phase 03 — Database Index

> Vietnamese version: [README.vi.md](./README.vi.md)  
> **Canonical:** English.

## Status

**DRAFT CONTRACT IN PROGRESS.** Do **not** treat Finance as final. Identity / CRM / Legal drafts may be typed into Prisma **without** shipping a single all-domain production migration.

| Phase | Status |
|-------|--------|
| 00 — Project | LOCKED (plus 2026-08-17 scope-change rows) |
| 01 — Architecture | LOCKED |
| 02 — Domain | BASELINE COMPLETE / RE-LOCKING |
| 03 — Database | **DRAFT SCHEMA CONTRACT** |
| 04 — Development | After schema baseline |

**Prisma recommendation:** **YES, except Finance** — see [SchemaDesign.md](./SchemaDesign.md) §12.

## Documents

| Doc | Role |
|-----|------|
| [ModelingPrinciples.md](./ModelingPrinciples.md) | Keys, money, enums vs config, soft delete |
| [AggregateCatalog.md](./AggregateCatalog.md) | Aggregates, FKs, OPEN questions per bounded context |
| [SchemaDesign.md](./SchemaDesign.md) | Entities, constraints, ERDs, enum vs config, readiness matrix |
| [ImplementationFoundation.md](./ImplementationFoundation.md) | Supabase Auth mapping + NestJS contracts |

## Aggregate order

1. Identity  
2. CRM  
3. Legal  
4. Finance  
5. Communication  

**Collaboration is excluded.**

## Rules

- No `schema.prisma` / migrations in this documentation drop.  
- Configurable Kanban stages are **tables**, not Prisma enums.  
- Contract number uniqueness is a **database unique constraint**.  
- Finance does not store SePay SDK types.  
- Do not create CTV portal tables.  
- Do not duplicate Payment as Income.  
