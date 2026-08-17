# DYN CRM

Law-firm CRM monorepo (documentation in progress; implementation foundation next).

## Current Status

| Phase | Status |
|-------|--------|
| 00 — Project | LOCKED |
| 01 — Architecture | LOCKED |
| 02 — Domain | BASELINE COMPLETE / RE-LOCKING STAKEHOLDER CHANGES |
| 03 — Database | DRAFT SCHEMA CONTRACT |
| 04 — Development | AFTER DATABASE BASELINE |

Full board: [`OVERVIEW.md`](./OVERVIEW.md)

## Documentation

- Phase 00: [`docs/00-project/`](./docs/00-project/)
- Phase 01: [`docs/01-architecture/`](./docs/01-architecture/)
- Phase 02: [`docs/02-domain/`](./docs/02-domain/)
- Phase 03: [`docs/03-database/`](./docs/03-database/)

## Locked stack (MVP)

- Modular monolith · NestJS BFF → Supabase Auth · RBAC in NestJS
- Prisma → Supabase PostgreSQL · StoragePort (Supabase Storage; MinIO adapter for local/dev)
- Redis + BullMQ · Next.js · Resend · PaymentProviderPort (SePay **candidate**)
- Finance: Contract → Order → Payment → VAT Invoice (invoice **after** payment)
- CTV portal: **SUPERSEDED 2026-08-17** — do not implement unless Scope restores it
