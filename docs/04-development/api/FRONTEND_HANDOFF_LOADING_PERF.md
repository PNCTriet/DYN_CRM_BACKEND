# Frontend handoff — BE đã ship hydrate names + order detail (2026-10-06)

> Copy **§ Prompt** vào agent FE.  
> API prod: `https://apidyn.otcayxe.com/api/v1` · Docs: `orders.md` / `expenses.md` / `payments.md`

## Đã ship trên BE

1. **List/detail hydrate display names** (batch JOIN, không cần N+1):
   - `GET /orders`, `GET /orders/:id` → `customerName`, `serviceName`, `assignedUserName`, `submitterName`, `reviewerName`, `collaboratorName`
   - `GET /expenses` → `requestedByName`, `reviewedByName`, `orderNumber`
   - `GET /payments` → `orderNumber`, `customerId`, `customerName`
2. **Payment schedule empty = 200** (không còn 404):  
   `GET /orders/:orderId/payment-schedule` → `{ id: null, orderId, lines: [], empty: true, … }`
3. **Aggregate chi tiết đơn:** `GET /orders/:id/detail`  
   → `{ order, paymentSchedule, payments, expenses, documents }`
4. `commissionPercent` trên Order đã có từ trước (persist POST/PATCH/GET).

`GET /users` đã trả `roleCodes` từ trước — không cần N× `GET /users/:id` chỉ để lấy role.

---

## § Prompt (copy cho FE)

```text
Bạn là Frontend lead (Next.js) của DYN CRM (repo CRM-DNY-UI).
Backend đã ship tối ưu loading (commit trên DYN_CRM_BACKEND main). Nhiệm vụ: cập nhật FE để BỎ N+1 lookup tên và rút critical path trang đơn — khớp contract BE.

## Docs / API
- Base: https://apidyn.otcayxe.com/api/v1
- docs/04-development/api/orders.md
- docs/04-development/api/expenses.md
- docs/04-development/api/payments.md
- docs/04-development/api/FRONTEND_HANDOFF_LOADING_PERF.md

## Việc phải làm

### 1. Tắt / rút resolveEntityLookups khi BE đã hydrate
Trong apps/web/src/lib/entity-lookups.ts + hydrator:
- Sau GET /orders (và expenses/payments): nếu item có `customerName` và `assignedUserName` (orders) / `requestedByName` (expenses) → **không** gọi GET /customers/:id, /users/:id, /services/:id chỉ để lấy tên.
- Feature-detect per field (null vẫn được fallback lookup nếu cần; ưu tiên bỏ hẳn trên /orders).

### 2. Order detail dùng aggregate
Trang /orders/:id (tab Thu chi):
- Primary: GET /orders/:id/detail (1 RTT).
- Map order + paymentSchedule + payments + expenses + documents từ response.
- Bỏ chuỗi GET order + payments?orderId + expenses?orderId + payment-schedule trên critical path (có thể giữ fallback cũ nếu detail 404 tạm thời).

### 3. Payment schedule — đừng treat 404 = empty
GET /orders/:orderId/payment-schedule:
- 200 + empty:true / lines:[] = chưa có lịch.
- Chỉ 404 khi order không tồn tại / ngoài scope.
- Xóa logic coi 404 là “chưa có schedule”.

### 4. Types
Cập nhật ApiOrder / ApiExpense / ApiPayment:
- Order: customerName, serviceName, assignedUserName, submitterName, reviewerName, collaboratorName, commissionPercent
- Expense: requestedByName, reviewedByName, orderNumber
- Payment: orderNumber, customerId, customerName

### 5. Không làm
- Không preload full catalog users/customers chỉ để gắn tên trên /orders.
- Không invent API lương; payroll vẫn tính trên FE từ orders+payments+expenses (giờ đã có tên sẵn).

## Acceptance
- [ ] Mở /orders pageSize=20: DevTools 0 call GET /customers/:id hoặc /users/:id chỉ để resolve tên.
- [ ] User không có user.manage vẫn thấy assignedUserName trên list order.
- [ ] Mở /orders/:id: critical path ưu tiên 1× GET .../detail (không còn 3–4 finance call tuần tự).
- [ ] Order chưa có payment-schedule: không spam 404; UI empty bình thường.
- [ ] Map UI dùng *Name fields trước UUID.
```
