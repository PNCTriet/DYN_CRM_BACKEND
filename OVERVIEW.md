# DYN CRM — Project Overview

> Updated: **2026-09-07** — API phases A–H live (H3 email logs TODO); Documents upload + signed download verified.

## Current Status

| Area | Status |
|------|--------|
| DB / Prisma / Supabase | Live |
| Auth BFF | Live — [FRONTEND_HANDOFF_AUTH](./docs/04-development/api/FRONTEND_HANDOFF_AUTH.md) |
| Domain APIs (CRM→Finance→CTV→Comms) | Live — [api/README](./docs/04-development/api/README.md) |
| Admin Identity APIs (B2–B5) | Live — [identity-admin.md](./docs/04-development/api/identity-admin.md) |
| Documents (Storage upload) | Live — [documents.md](./docs/04-development/api/documents.md) |
| Báo cáo tình hình | [StatusReport.md](./docs/04-development/StatusReport.md) |

## FE — bắt đầu ở đây

1. [`docs/04-development/api/FRONTEND_HANDOFF_AUTH.md`](./docs/04-development/api/FRONTEND_HANDOFF_AUTH.md)  
2. Swagger http://localhost:3000/docs  
3. Domain docs trong [`docs/04-development/api/`](./docs/04-development/api/) — upload file: [documents.md](./docs/04-development/api/documents.md)

## Run backend

```bash
pnpm dev:backend
```

## Roadmap

[`docs/04-development/ApiRoadmap.md`](./docs/04-development/ApiRoadmap.md)
