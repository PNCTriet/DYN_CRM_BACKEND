# Phase 03 — Mục lục Database

> Bản tiếng Việt của [README.md](./README.md). Canonical: English.

## Trạng thái

**HỢP ĐỒNG DRAFT.** Không coi Finance là final. Identity / CRM / Legal có thể gõ Prisma; không migrate production một lần cả hệ thống.

Khuyến nghị Prisma: **YES, except Finance** — [SchemaDesign.vi.md](./SchemaDesign.vi.md).

## Tài liệu

| Doc | Vai trò |
|-----|---------|
| [ModelingPrinciples.vi.md](./ModelingPrinciples.vi.md) | Nguyên tắc mô hình |
| [AggregateCatalog.vi.md](./AggregateCatalog.vi.md) | Aggregate, FK, OPEN |
| [SchemaDesign.vi.md](./SchemaDesign.vi.md) | Entity, ràng buộc, ERD, ma trận sẵn sàng |
| [ImplementationFoundation.vi.md](./ImplementationFoundation.vi.md) | Hợp đồng Supabase Auth + NestJS |

Thứ tự: Identity → CRM → Legal → Finance → Communication. **Không Collaboration.**
