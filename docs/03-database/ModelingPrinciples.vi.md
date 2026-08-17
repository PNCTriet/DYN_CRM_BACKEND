# Nguyên tắc mô hình Database — DYN CRM

> Bản tiếng Việt của [ModelingPrinciples.md](./ModelingPrinciples.md). Canonical: English.

Một PostgreSQL (Supabase); Prisma là đường persistence duy nhất. Tên bảng theo Glossary English.

- Giá trị cấu hình được (cột Kanban / stage, catalog permission, N tháng hết hạn) là **dòng dữ liệu**, không phải Prisma enum.
- Contract Status chỉ là Prisma enum **nếu** nhãn Glossary vẫn khóa. Nếu Kanban = status hợp đồng → đây là đổi rule — status thành data.
- Tiền: DECIMAL; không float. Thời gian: timestamptz UTC.
- Audit: createdAt/updatedAt + user. Soft delete `deletedAt` cho master có lịch sử.
- Unique **trong DB**: số hợp đồng; mã permission. Check ở app không đủ.
- Không tạo bảng portal CTV “cho chắc”.
- Payment provider: cột opaque `provider` / `providerPaymentId` — không đưa kiểu SePay vào domain.
- Ngày khách hàng chưa rõ nghĩa → không NOT NULL.

Chi tiết: bản English.
