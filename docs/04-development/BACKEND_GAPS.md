# Backend gaps — trạng thái xử lý

Nguồn: rà soát UI hiện tại vs contract `apps/web/document/api/*`.  
Cập nhật 2026-09-08 sau khi backend rà từng mục với code thật.

| # | Việc | Trạng thái |
|---|------|-----------|
| 1 | Google user chờ duyệt | **Đã làm** |
| 2 | Catalog qua `PATCH /config/:key` | Vốn đã chạy — không cần sửa |
| 3 | `Customer.status` | **Đã làm** (cần chạy migration) |
| 4 | `change-stage` giữ nguyên string | Vốn đã đúng — không cần sửa |
| 5 | Phân quyền trang | Chọn **A** — không cần code |
| 6 | Duyệt chi theo reviewer | **Đã làm** |
| 7 | Service status/archive | Vốn đã chạy — không cần sửa |
| 8 | Import khách Excel | Out of scope, FE gọi `POST /customers` từng dòng |
| 9 | Dashboard / realtime / documents | Không làm, FE tự gộp |
| 10 | Signup password giữ role mặc định | Giữ nguyên |

---

## 1. Google OAuth — user mới chờ duyệt ✅

`ensureLocalUser` trước đây dùng chung cho cả ba luồng và hard-code `ACTIVE` + `DEFAULT_SIGNUP_ROLE`. Nay nhận thêm `status` và `defaultRoleCode` nullable:

| Luồng | status | role |
|-------|--------|------|
| Google lần đầu | `PENDING_APPROVAL` | không gán |
| `POST /auth/signup` | `ACTIVE` | `DEFAULT_SIGNUP_ROLE` |
| Login password (chưa có user local) | `ACTIVE` | `DEFAULT_SIGNUP_ROLE` |

`PENDING_APPROVAL` là giá trị **mới** trong enum `UserStatus` — cần migration. `AuthGuard` cố ý **không** chặn status này để FE gọi được `/auth/me`; user không có role nên mọi endpoint `@RequirePermission` trả 403.

Admin duyệt: `PUT /users/:id/roles` + `PATCH /users/:id { status: "ACTIVE" }` (đều cần `user.manage`, cả hai endpoint đã có sẵn).

Chi tiết: [`api/auth.md`](./api/auth.md) mục "User Google lần đầu — chờ admin duyệt".

## 2. Catalog giai đoạn / status khách — không cần sửa

`PATCH /config/:key` là Prisma upsert thật nên key mới (`crm.orderStages`, `crm.customerStatusCatalog`, `crm.pagePermissions`) tự tạo, không cần seed. `GET /config` trả tất cả, không filter. `config.manage` đã seed cho `ADMIN` và `SUPER_ADMIN`.

Hai giới hạn cần biết: `valueJson` phải là object/array (`@IsObject()` chặn scalar), và `GET /config` chỉ yêu cầu đăng nhập — mọi user đọc được config.

## 3. Status trên từng khách hàng ✅

`Customer.status` là `String @default("active")`, có index, **không** enum — key tùy ý từ catalog. Hỗ trợ trên `POST /customers`, `PATCH /customers/:id`, response, và filter `GET /customers?status=`.

Đính chính mô tả cũ: `main.ts` bật `forbidNonWhitelisted: true`, nên trước khi sửa thì `PATCH { status }` trả **400** chứ không phải bị strip âm thầm.

## 4. `POST /orders/:id/change-stage` — không cần sửa

`ChangeOrderStageDto.stage` là `@IsString() @MaxLength(50)`, `Order.stage` là `String @default("new")` (không enum Prisma), service ghi thẳng `stage: dto.stage` không normalize, không state machine. Permission là `order.change_stage`, không dính `order.approve`. `STAGE_TRANSITION_REQUIRES_APPROVAL` không tồn tại trong code.

Nếu FE thấy stage nhảy sau reload thì nguyên nhân nằm ngoài endpoint này.

## 5. Phân quyền trang — chọn phương án A

Không map page→permission ở backend. Cả 11 permission trong bảng gợi ý đều đã có trong seed, và `PUT /roles/:id/permission-groups` (cần `role.manage`) cũng đã có. Admin seed/map group là đủ; matrix `crm.pagePermissions` chỉ là UX của FE.

## 6. Đề nghị thanh toán — chỉ reviewer được duyệt ✅

`POST /expenses/:id/approve|reject` giờ load order và chặn:

| Trường hợp | Kết quả |
|------------|---------|
| `currentUser.id === order.reviewerUserId` | duyệt được |
| Khác reviewer | **403** |
| `reviewerUserId` null | **400** — phải set reviewer trước |

Trước đây **không có đường nào** set `order.reviewerUserId` (chỉ `approve()` tự gán), nên đã thêm field này vào `PATCH /orders/:id` (gửi `null` để xoá).

## 7. Dịch vụ — không cần sửa

`Service.status` đã là `String @default("ACTIVE")`, `PATCH /services/:id { status }` persist, `POST /services/:id/archive` set `ARCHIVED`, `GET` trả `status` và filter được.

---

## Triển khai

Migration `20260908060000_customer_status_and_pending_approval` thêm `PENDING_APPROVAL` vào enum và cột `customers.status`. Railway **không** chạy migration khi deploy (`railway.toml` chỉ generate + build), nên phải apply thủ công:

```bash
cd apps/backend && pnpm exec prisma migrate deploy
```

Chạy trước khi deploy code mới, vì code đã tham chiếu `PENDING_APPROVAL` và `customers.status`.

---

## Ghi chú cho FE

- `PATCH /customers/:id { status }` là luồng chuẩn để đổi status khách, không có endpoint riêng.
- Sau khi admin gán role, user phải refresh `/auth/me` (hoặc đăng nhập lại) mới có permission.
- Muốn duyệt chi thì đơn phải có `reviewerUserId` — set qua `PATCH /orders/:id`.
