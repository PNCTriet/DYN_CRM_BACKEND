# DYN CRM — Project Overview

> Tóm tắt trạng thái dự án và công việc đã hoàn thành.  
> Cập nhật lần cuối: **2026-08-03** — **Phase 01 Architecture hoàn tất**

---

## 1. Dự án là gì?

**DYN CRM** — hệ thống CRM/ERP cho văn phòng luật: quản lý Lead/Customer, hợp đồng, workflow, tài chính (Order → Invoice → Payment), VAT, hoa hồng CTV, dashboard và thông báo.

| Hạng mục | Giá trị đã khóa |
|----------|-----------------|
| Tenancy MVP | Single-tenant (thiết kế sẵn multi-tenant) |
| Người dùng ước lượng | ~30 concurrent |
| Thời gian MVP | 4–5 tháng |
| Kiến trúc | Modular monolith (DDD-lite), monorepo |
| Stack (MVP) | NestJS + Worker (Railway), Next.js (Vercel), Prisma → Supabase PG, Supabase Auth (BFF), Supabase Storage (port), Redis/BullMQ (Railway), Resend |
| UI MVP | Tiếng Việt (English ở Phase 2) |
| Docs kỹ thuật | English + bản `.vi.md` cho stakeholder |

---

## 2. Việc đã làm

### 2.1 Phase 00 — Project ✅

| File (EN) | File (VI) | Nội dung |
|-----------|-----------|----------|
| `docs/00-project/README.md` | `README.vi.md` | Mục lục |
| `Vision.md` | `Vision.vi.md` | Tầm nhìn |
| `Scope.md` | `Scope.vi.md` | Phạm vi MVP |
| `Business.md` | `Business.vi.md` | Nghiệp vụ / value stream |
| `Timeline.md` | `Timeline.vi.md` | Lịch 4–5 tháng |
| `Roadmap.md` | `Roadmap.vi.md` | Sau MVP |
| `Glossary.md` | `Glossary.vi.md` | Thuật ngữ |

### 2.2 Phase 01 — Architecture ✅

| File | Status |
|------|--------|
| `Architecture.md` (+ `.vi`) | ✅ Locked |
| `TechStack.md` (+ `.vi`) | ✅ Locked |
| `Module.md` (+ `.vi`) | ✅ Locked |
| `Security.md` (+ `.vi`) | ✅ Locked |
| `Deployment.md` (+ `.vi`) | ✅ Locked |
| `Monitoring.md` (+ `.vi`) | ✅ Locked |
| `Decisions/ADR-001.md` | ✅ Accepted — Modular monolith + ports |
| `Decisions/ADR-002.md` | ✅ Accepted — Prisma + Supabase PG SoR |

```text
docs/
  00-project/          ✅
  01-architecture/     ✅
  02-domain/           ⏳ Tiếp theo
  03-database/         ⏳
  04-development/      ⏳
  05-guidelines/       ⏳
```

### 2.3 Chưa làm (cố ý)

- Chưa scaffold monorepo / code ứng dụng
- Chưa Prisma schema / migration
- Chưa Phase 02 Domain trở đi

---

## 3. Quyết định nghiệp vụ đã khóa (tóm tắt)

```text
Lead → Qualified → Customer (Individual | Company)
Customer: 1 Owner + Followers tùy chọn
Contract → Order → Invoice → Payment → Commission (trên tiền đã thu)
VAT 10% exclusive · VND · Partial payment · CTV portal hạn chế
```

---

## 4. Việc tiếp theo

| Thứ tự | Việc |
|--------|------|
| 1 | **Phase 02 — Domain** (`docs/02-domain/*`) |
| 2 | Phase 03 — Database |
| 3 | Phase 04–05 — Dev & Guidelines |
| 4 | Implementation — monorepo scaffold |

---

## 5. Điểm vào nhanh

| Mục đích | Đường dẫn |
|----------|-----------|
| Overview | [`OVERVIEW.md`](./OVERVIEW.md) |
| Phase 00 | [`docs/00-project/README.md`](./docs/00-project/README.md) |
| Phase 01 Architecture | [`docs/01-architecture/Architecture.md`](./docs/01-architecture/Architecture.md) |
| ADR | [`docs/01-architecture/Decisions/`](./docs/01-architecture/Decisions/) |
