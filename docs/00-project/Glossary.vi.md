# Thuật ngữ — DYN CRM

> Bản tiếng Việt của [Glossary.md](./Glossary.md). Canonical: bản English.  
> **Trong code/API/DB:** dùng thuật ngữ English canonical. Bản này giải thích cho stakeholder và UI VI.

## 1. Mục đích

Thiết lập **thuật ngữ English chuẩn** (và nhãn UI tiếng Việt khi đã biết) để code, API, bảng DB và tài liệu dùng một bộ từ vựng.

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
|---------------|---------------|
| Thuật ngữ sản phẩm và domain | Bộ copy UI tiếng Việt đầy đủ |
| Tên status và role đã khóa MVP | Schema field triển khai |

Nếu code và docs lệch nhau, **glossary này thắng** cho đến khi cập nhật chính thức.

## 3. Bối cảnh

CRM văn phòng luật trộn ngôn ngữ CRM (Lead, Customer), pháp lý (Contract) và kế toán (Order, Invoice, Payment). Đặt tên mơ hồ — đặc biệt **Order vs Matter** và **Lead vs Customer** — gây lỗi schema/UI. Stakeholder đã khóa **Order** (không dùng Matter) để khớp accounting.

## 4. Thiết kế

### 4.1 Quy tắc đặt tên

| Quy tắc | Ví dụ |
|---------|--------|
| Dùng English Glossary trong code, Prisma, API path | `Contract`, `Order`, `Commission` |
| Tiếng Việt cho nhãn UI MVP | map qua i18n key |
| Không đổi synonym trong cùng một layer | Không gọi Order là “Contract” trong API |
| Status trong docs: PascalCase; code: `SCREAMING_SNAKE` | `In Progress` → `IN_PROGRESS` |

### 4.2 Thuật ngữ lõi

| Term (EN) | Định nghĩa | Nhãn UI VI (gợi ý MVP) | Ghi chú |
|-----------|------------|-------------------------|---------|
| DYN CRM | Tên sản phẩm | DYN CRM | Chính tả đã khóa |
| Lead | Hồ sơ khách tiềm năng trước Customer | Tiềm năng / Lead | **Entity riêng** |
| Qualified | Bước/state Lead tiến tới convert | Đạt chuẩn | Bộ status đầy đủ TBD |
| Customer | Hồ sơ khách: Individual hoặc Company | Khách hàng | Đúng một Owner |
| Individual | Loại Customer là người | Cá nhân | |
| Company | Loại Customer là tổ chức | Công ty | |
| Contact | Người gắn Customer (và có thể Lead) | Liên hệ | |
| Owner | User phụ trách chính của Customer | Người phụ trách | Đúng một |
| Follower | User theo dõi thêm một Customer | Người theo dõi | Tùy chọn, nhiều |
| Contract | Thỏa thuận pháp lý với Customer | Hợp đồng | Không phải bút toán sổ cái |
| Order | Giao dịch tài chính sinh từ Contract | Đơn hàng / Order | **Không đổi thành Matter** |
| Milestone | Mốc thanh toán/tiến độ dùng để xuất HĐ | Mốc | Nguồn invoice |
| Invoice | Hóa đơn phát hành cho khách | Hóa đơn | Nguồn: Contract, Milestone, Manual |
| Manual Invoice | Hóa đơn tạo thủ công trong khuôn khổ finance | Hóa đơn thủ công | Vẫn audit |
| Payment | Bút toán tiền đã thu | Thanh toán | Cho partial |
| Partial Payment | Số thanh toán nhỏ hơn số còn lại | Thanh toán một phần | |
| VAT | Thuế GTGT | Thuế GTGT | MVP: 10% exclusive |
| Exclusive VAT | Thuế cộng trên số net | Chưa bao gồm thuế | Đã khóa MVP |
| Commission | Số hoa hồng tính từ tiền đã thu | Hoa hồng | % cấu hình được |
| Collaborator / CTV | Đối tác giới thiệu ngoài (lịch sử) | CTV / Cộng tác viên | **SUPERSEDED portal 2026-08-17** — tiền qua Finance thu/chi hoặc note |
| CTV Portal | Bề mặt app hạn chế cho CTV | Cổng CTV | **Không implement** trừ khi S6 đảo |
| Income / Thu | Tab thu (khái niệm) | Thu | Lưu trữ **OPEN** |
| Expense / Chi | Tab chi; cần duyệt | Chi | Lưu trữ **OPEN** |
| Order validity | Thời hạn dịch vụ/đơn hàng | Thời hạn đơn hàng | Alert N tháng cấu hình được |
| Contract number | Định danh nghiệp vụ hợp đồng | Số hợp đồng | **Duy nhất** (ràng buộc DB) |
| Workflow Template | Cấu hình stage do admin định nghĩa | Mẫu quy trình | Không BPMN MVP |
| Workflow | Instance template trên ngữ cảnh công việc | Quy trình | |
| Task | Đơn vị công việc trong workflow | Công việc | Assignee, hạn |
| Due Date | Hạn của task | Hạn xử lý | |
| Reminder | Nhắc trước/đúng hạn | Nhắc việc | |
| Assignee | User chịu trách nhiệm task | Người được giao | |
| Kanban | Góc nhìn board theo stage | Kanban | |
| Timeline / Activity | Lịch sử sự kiện theo thời gian | Dòng thời gian / Hoạt động | |
| File | Object lưu qua StoragePort (MVP: Supabase Storage) | Tài liệu / File | |
| Dashboard | Góc nhìn tổng hợp vận hành | Bảng điều khiển | |
| Notification | Cảnh báo in-app | Thông báo | |
| Configuration | Cài đặt hệ thống | Cấu hình | |
| Role | Role RBAC có tên | Vai trò | Xem danh sách role |
| Permission | Đơn vị ủy quyền chi tiết | Quyền | |
| Modular Monolith | Đơn vị deploy có ranh giới module nội bộ | — | Phong cách kiến trúc |
| Single-tenant | Một văn phòng / một deployment | — | MVP |
| Multi-tenant ready | Thiết kế sẵn cho cô lập tenant sau | — | Không phải feature MVP |

### 4.3 Status Contract (nhãn đã khóa)

| Status | Code (đề xuất) | Ý nghĩa |
|--------|----------------|---------|
| Draft | `DRAFT` | Soạn thảo nội bộ |
| Review | `REVIEW` | Rà soát nội bộ |
| Waiting Customer | `WAITING_CUSTOMER` | Chờ khách |
| Signed | `SIGNED` | Đã ký |
| In Progress | `IN_PROGRESS` | Đang thực hiện |
| Completed | `COMPLETED` | Hoàn thành |
| Cancelled | `CANCELLED` | Hủy / dừng |

### 4.4 Role (đã khóa)

| Role | Code (đề xuất) |
|------|----------------|
| Super Admin | `SUPER_ADMIN` |
| Admin | `ADMIN` |
| Manager | `MANAGER` |
| Lawyer | `LAWYER` |
| Legal Assistant | `LEGAL_ASSISTANT` |
| Accounting | `ACCOUNTING` |
| Sales | `SALES` |
| Collaborator (CTV) | `COLLABORATOR` | **Chờ gỡ** cùng S6 — không seed trừ khi khôi phục |

### 4.5 Phương thức thanh toán (MVP)

| Term | Code (đề xuất) |
|------|----------------|
| Cash | `CASH` |
| Bank Transfer | `BANK_TRANSFER` |
| QR Payment | `QR_PAYMENT` |

### 4.6 Chuỗi tài chính (cụm từ chuẩn)

**Contract → Order → Payment Schedule → Payment → Debt → VAT Invoice** (→ Commission **chỉ nếu khóa lại**)

(Hóa đơn VAT phát hành **sau** Payment.)

### 4.7 Thuật ngữ từ chối / tránh

| Tránh | Dùng thay | Lý do |
|-------|-----------|--------|
| Matter (thay Order) | Order | Khóa stakeholder khớp accounting |
| Deal (mơ hồ) | Lead / Contract tùy ngữ cảnh | Không rõ giai đoạn |
| Client (trong code) | Customer | Nhất quán (UI có thể nói khách hàng) |
| Partner (mơ hồ) | Collaborator / CTV | Tránh nhầm với partner luật |

## 5. Quy tắc nghiệp vụ

1. Thuật ngữ mới phải cập nhật Glossary trước khi merge API dùng thuật ngữ đó.
2. Enum code mục 4 là **đề xuất**; Prisma enum cuối xác nhận ở `03-database/`.
3. Nhãn VI có thể chỉnh bởi UX mà không đổi English canonical.
4. MVP không được lưu Lead chỉ như một status của Customer (rule entity riêng).

## 6. Best practices

- Tên Prisma model khớp Glossary (`Customer`, `Lead`, `Contract`, `Order`).
- API path: `/customers`, `/leads`, `/contracts`, `/orders`, `/invoices`, `/payments`.
- i18n key: `customer.owner`, `contract.status.in_progress`, …
- Trong PR, từ chối đưa synonym âm thầm.

## 7. Ví dụ

**API tốt:** `POST /contracts/{id}/orders` — tạo Order từ Contract.  
**API xấu:** `POST /matters` — vi phạm naming đã khóa.  
**UI tốt:** Nhãn “Hợp đồng” gắn entity `Contract`.  
**Model xấu:** `Customer.status = LEAD` là cách duy nhất biểu diễn Lead.

## 8. Cải tiến tương lai

| Hạng mục | Ghi chú |
|----------|---------|
| Bộ copy VI đầy đủ | Phase 2 cùng UI English |
| Thuật ngữ lĩnh vực | Khi module đó vào scope |
| Thuật ngữ gateway | VNPay, MoMo, Stripe |
| Thuật ngữ Tenant / Organization | Phase multi-tenant |

## 9. Tham chiếu

- `Scope.md` / `Scope.vi.md`
- `Business.md` / `Business.vi.md`
- Quyết định stakeholder 2026-08-02

---

## Tài liệu liên quan gợi ý

- `Business.vi.md` — thuật ngữ tương tác trong value stream
- `02-domain/*.md` — rule từng entity (Phase 02)
- `04-development/APIConvention.md` — quy ước path (Phase 04)
- `03-database/NamingConvention.md` — tên bảng/cột (Phase 03)

## TODO

- [ ] Xác nhận nhãn VI cuối với product owner (bảng 4.2)
- [ ] Xác nhận enum status Lead ngoài khái niệm “Qualified”
- [ ] Xác nhận nhãn VI cho Order (Đơn hàng hay ngôn ngữ nội bộ khác)
- [ ] Xác nhận cardinality quan hệ Contact ở domain docs
