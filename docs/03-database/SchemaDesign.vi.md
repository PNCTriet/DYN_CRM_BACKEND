# Hợp đồng thiết kế schema — DYN CRM Phase 03

> Bản tiếng Việt của [SchemaDesign.md](./SchemaDesign.md). Canonical: English.

**Không phải `schema.prisma`.** PK giả định UUID. Tiền NUMERIC VND. Không bảng portal CTV.

Chi tiết cột/ERD: bản English. Dưới đây là quyết định mô hình.

## Identity

User nghiệp vụ ≠ Supabase Auth. `authSubjectId` unique. RBAC: Permission `resource.action` unique; unknown ⇒ deny.  
Draft **có** PermissionGroup (giả định, chưa LOCKED). Không bảng Organization. “Nhi” không phải entity — là permission/user.

## CRM

Hai bảng Lead / Customer. type Customer = enum Individual\|Company. ownerId bắt buộc. Follower M:N.  
Không unique phone/email. ImportRow chứa cờ trùng.  
Export: `industryOrField` string; “đã dùng DV” **derive** (giả định: có Contract — OPEN). **Không** thêm cột ngày.

## Legal

`contractNumber` unique ở DB. Status Contract = enum ứng viên Glossary. Cột Kanban = bảng WorkflowStage. Hai khái niệm **cùng tồn tại** đến khi chốt Stage vs Status.  
Sinh số vs nhập tay: cả hai đều là string bắt buộc — OPEN thuật toán.

## Finance

Chuỗi: Contract → Order → Schedule → Payment → (nợ derive) → VatInvoice. Invoice sau Payment = rule use case.  
Order: serviceStart/End (required OPEN); status **không** enum. N tháng: AppConfig.  
Payment: method enum CASH/BANK_TRANSFER/QR; verification string; không bảng SePay.  
VatInvoice.paymentId nullable — cardinality **OPEN**.  
Thu/Chi: **ASSUMPTION Option A** — không bảng Income; có bảng Expense (gồm ctvRelated). Commission **không** core. Debt **không** bảng.

## Communication

Notification (recipient User + sourceType/id). Reminder optional. Email log. AppConfig cho N.

## Enum vs config (rút gọn)

| Khái niệm | DB | Trạng thái |
|-----------|-----|------------|
| Customer type, Payment method | Prisma enum | LOCKED |
| Contract status | Enum **nếu** Kanban ≠ status | CONDITIONAL |
| Kanban stage | Bảng | LOCKED hướng |
| Lead status, Order status | String | OPEN — không bịa |
| Permission, Stage, N tháng | Data / AppConfig | Config |
| Industry, ngày khách | VARCHAR / không cột | OPEN |

## Ma trận sẵn sàng

| Area | Draft | Final | Signal |
|------|-------|-------|--------|
| Identity | Có | Gần | YELLOW (Group, COLLABORATOR) |
| CRM | Có | Chưa | YELLOW |
| Legal | Có | Chưa | YELLOW (Kanban vs Status) |
| Finance | Một phần | Không | RED freeze; YELLOW sketch Order/Payment |
| Communication | Có | Gần | YELLOW |
| Collaboration | Bỏ | Bỏ | GREEN omit |

## Khuyến nghị

**Có thể bắt đầu `schema.prisma`? → YES, except Finance**

Identity/CRM/Legal đủ để gõ Prisma (string thay enum cho status chưa khóa). Finance chỉ sketch — không migrate production cả chuỗi tiền cho đến khi chốt status Order, Debt, Payment↔Invoice, Thu/Chi.
