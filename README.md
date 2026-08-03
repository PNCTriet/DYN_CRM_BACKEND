# DYN CRM

Law-firm CRM monorepo (documentation in progress; implementation not started).

## Status

| Phase | Status |
|-------|--------|
| 00 — Project | Done |
| 01 — Architecture | **Done** |
| 02 — Domain | Next |
| 03 — Database | Pending |
| 04 — Development | Pending |
| 05 — Guidelines | Pending |

Full summary: [`OVERVIEW.md`](./OVERVIEW.md)

## Documentation

- Phase 00: [`docs/00-project/README.md`](./docs/00-project/README.md)
- Phase 01: [`docs/01-architecture/Architecture.md`](./docs/01-architecture/Architecture.md)
- ADRs: [`docs/01-architecture/Decisions/`](./docs/01-architecture/Decisions/)

## Locked stack (MVP)

- Modular monolith · NestJS BFF → Supabase Auth · RBAC in NestJS
- Prisma → Supabase PostgreSQL · StoragePort → Supabase Storage
- Redis + BullMQ worker on Railway · Next.js on Vercel · Resend
- Finance: Contract → Order → Invoice → Payment → Commission (collected payment)
