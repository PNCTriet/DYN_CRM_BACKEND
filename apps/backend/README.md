# Backend — NestJS modular monolith

## Stack

- NestJS + Prisma + PostgreSQL (**Supabase**)
- API prefix: `/api/v1`
- Swagger UI: `/docs`
- Auth: Bearer → AuthGuard → RBAC Guard → Resource Policy

## Connect Supabase

1. Supabase Dashboard → **Project Settings → Database → Connection string**
2. Copy connection URIs into `apps/backend/.env`:

```bash
cp apps/backend/.env.example apps/backend/.env
```

| Env | Use |
|-----|-----|
| `DATABASE_URL` | App runtime (Transaction pooler `:6543` + `?pgbouncer=true` recommended) |
| `DIRECT_URL` | `prisma migrate` (Direct / Session `:5432`, **no** pgbouncer) |

Password URL-encode nếu có ký tự đặc biệt (`@`, `#`, …).

3. Apply schema (dev):

```bash
pnpm prisma:generate
pnpm --filter @dyn-crm/backend prisma:migrate -- --name init
```

4. Seed test data (RBAC users + CRM/Finance sample):

```bash
pnpm --filter @dyn-crm/backend prisma:seed
```

5. Start:

```bash
pnpm dev:backend
```

- API: http://localhost:3000/api/v1  
- Swagger: http://localhost:3000/docs  

Trong Swagger → **Authorize** → dán token dạng `test:<userId>` (xem output seed).

## First vertical slice

`CRM Customer` — `POST|GET|PATCH|DELETE /api/v1/customers`

## Do not

- Use `prisma db push` for production migrations
- Hard-code role names in controllers
- Commit `.env` (secrets)
