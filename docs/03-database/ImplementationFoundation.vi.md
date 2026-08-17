# Nền tảng triển khai — hợp đồng Supabase + NestJS

> Bản tiếng Việt của [ImplementationFoundation.md](./ImplementationFoundation.md). Canonical: English.

Không có code ứng dụng trong tài liệu này.

**Supabase:** PostgreSQL = SoR qua Prisma. Auth = IdP; client chỉ qua NestJS BFF. Map `sub` → User Identity (unique). User deactivated không được hành động dù IdP còn session. StoragePort: adapter Supabase Storage (prod) và/hoặc MinIO (local). RLS không phải nguồn RBAC.

**NestJS:** Modular monolith DDD-lite — Identity, CRM, Legal, Finance, System. Prisma ở infrastructure. Guard RBAC; unknown permission ⇒ deny. QueuePort cho mail/reminder/alert hết hạn/hóa đơn. PaymentProviderPort cho SePay (candidate). Không module Collaboration đến khi S6 đảo.

**Compose local:** Redis, MinIO, Postgres tuỳ chọn. Production vẫn Phase 01 (Vercel + Railway + Supabase) trừ khi Deployment khóa lại.

Lát cắt đầu: Identity/RBAC → CRM → Legal (số HĐ unique) → Finance.
