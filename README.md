# DYN CRM

Law-firm CRM monorepo (documentation in progress; implementation not started).

## Status

| Phase | Status |
|-------|--------|
| 00 — Project | Done |
| 01 — Architecture | Done |
| 02 — Domain | **Delivered** — close Open Questions next |
| 03 — Database | Pending |
| 04 — Development | Pending |
| 05 — Guidelines | Pending |

Full summary: [`OVERVIEW.md`](./OVERVIEW.md)

## Documentation

- Phase 00: [`docs/00-project/`](./docs/00-project/)
- Phase 01: [`docs/01-architecture/`](./docs/01-architecture/)
- Phase 02: [`docs/02-domain/`](./docs/02-domain/)

## Locked stack (MVP)

- Modular monolith · NestJS BFF → Supabase Auth · RBAC in NestJS
- Prisma → Supabase PostgreSQL · StoragePort → Supabase Storage
- Redis + BullMQ worker on Railway · Next.js on Vercel · Resend
- Finance: Contract → Order → Invoice → Payment → Commission (collected payment)
