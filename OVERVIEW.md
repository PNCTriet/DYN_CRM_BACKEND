# DYN CRM — Project Overview

> Updated: **2026-09-07** — API live on Railway (`apidyn.otcayxe.com`); FE integration prompt + module API convention published.

## Current Status

| Area | Status |
|------|--------|
| DB / Prisma / Supabase | Live (Railway dùng Supabase **pooler** `ap-northeast-2`) |
| Auth BFF | Live — [FRONTEND_HANDOFF_AUTH](./docs/04-development/api/FRONTEND_HANDOFF_AUTH.md) |
| Domain APIs (CRM→Finance→CTV→Comms) | Live — [api/README](./docs/04-development/api/README.md) |
| Admin Identity APIs (B2–B5) | Live — [identity-admin.md](./docs/04-development/api/identity-admin.md) |
| Documents (Storage upload) | Live — [documents.md](./docs/04-development/api/documents.md) |
| FE integrate prompt | [FRONTEND_INTEGRATION_PROMPT.md](./docs/04-development/api/FRONTEND_INTEGRATION_PROMPT.md) |
| Báo cáo tình hình | [StatusReport.md](./docs/04-development/StatusReport.md) |

## FE — bắt đầu ở đây

1. [`FRONTEND_INTEGRATION_PROMPT.md`](./docs/04-development/api/FRONTEND_INTEGRATION_PROMPT.md) — **copy prompt** + quy ước 1 module/domain  
2. [`FRONTEND_HANDOFF_AUTH.md`](./docs/04-development/api/FRONTEND_HANDOFF_AUTH.md)  
3. Swagger prod: https://apidyn.otcayxe.com/docs  
4. Domain contracts: [`docs/04-development/api/`](./docs/04-development/api/)

## Production

| | |
|--|--|
| API | `https://apidyn.otcayxe.com/api/v1` |
| Swagger | https://apidyn.otcayxe.com/docs |

## Run backend (local)

```bash
pnpm dev:backend
```

## Roadmap

[`docs/04-development/ApiRoadmap.md`](./docs/04-development/ApiRoadmap.md)
