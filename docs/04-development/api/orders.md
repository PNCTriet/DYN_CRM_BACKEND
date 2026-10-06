# Orders API — FE contract

> **Status: LIVE** · Module: `finance` · Swagger tag: `orders`  
> Base: `/api/v1/orders`

## Permissions

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| POST | `/orders` | `order.create` | — |
| GET | `/orders` | `order.view` | OWN → `assignedUserId`; ALL if `order.assign` |
| GET | `/orders/:id` | `order.view` | Must be in scope |
| GET | `/orders/:id/detail` | `order.view` | Must be in scope — aggregate (order + schedule + payments + expenses + documents) |
| PATCH | `/orders/:id` | `order.update` | Must be in scope |
| POST | `/orders/:id/assign` | `order.assign` | Must be in scope |
| POST | `/orders/:id/change-stage` | `order.change_stage` | Must be in scope |
| POST | `/orders/:id/approve` | `order.approve` | Must be in scope |
| GET | `/orders/:orderId/payment-schedule` | `order.view` | Must be in scope |
| POST | `/orders/:orderId/payment-schedule` | `order.update` | Must be in scope |

Decimals returned as **strings**.

---

## Types

```ts
interface Order {
  id: string;
  orderNumber: string;
  contractId: string;
  customerId: string;
  serviceId: string;
  stage: string;
  channel: string;
  collaboratorId: string | null;
  value: string;
  collaboratorPrice: string | null;
  /** % hoa hồng nhân viên phụ trách đơn (assignedUserId). Không phải % CTV. */
  commissionPercent: string | null;
  totalNet: string;
  vatRate: string;
  totalGross: string;
  currency: string;
  assignedUserId: string;
  submitterUserId: string;
  reviewerUserId: string | null;
  approvalStatus: string;
  notes: string | null;
  /** Civil day `YYYY-MM-DD` in Asia/Ho_Chi_Minh, or null. PostgreSQL DATE. */
  deadline: string | null;
  /** Stored column. Same string as `zaloGroupUrl`. */
  zaloGroupLink: string | null;
  /** FE name for `zaloGroupLink`. */
  zaloGroupUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Hydrated — FE should NOT N+1 GET /customers|/users|/services when present */
  customerName: string | null;
  serviceName: string | null;
  assignedUserName: string | null;
  submitterName: string | null;
  reviewerName: string | null;
  collaboratorName: string | null;
}
```

List/detail always batch-JOIN these names. User without `user.manage` still receives `assignedUserName`.

---

## GET `/orders/:id/detail`

One RTT for order page critical path:

```ts
{
  order: Order; // names hydrated
  paymentSchedule: {
    id: string | null;
    orderId: string;
    lines: Array<{ id; dueDate; amount; sortOrder }>;
    createdAt: string | null;
    updatedAt: string | null;
    empty: boolean; // true when no schedule yet
  };
  payments: Payment[];
  expenses: Expense[];
  documents: DocumentMetadata[];
}
```

---

## POST `/orders`

| Field | Required | Default |
|-------|----------|---------|
| orderNumber | yes | — |
| contractId, customerId, serviceId | yes | — |
| value, totalNet, totalGross | yes | — |
| assignedUserId | yes | — |
| submitterUserId | no | current user |
| collaboratorId | no | — |
| commissionPercent | no | `null` (staff % for `assignedUserId`, 0–100, 2 decimal places) |
| vatRate | no | `10` |
| currency | no | `VND` |
| stage | no | `new` |
| notes | no | — |

---

## PATCH `/orders/:id`

Permission: `order.update` + the same data scope as `GET /orders/:id` (out of scope → **403** `Outside data scope`; missing order → **404**).

Omit a field to keep the stored value. `null` clears nullable fields. A field that is not sent is never overwritten.

| Field | Rule |
|-------|------|
| `customerId` | UUID of an existing customer the caller can view (`customer.view` + `CustomerPolicy` scope). Unknown id → **400** `Customer not found`. Exists but not visible → **404** `Customer is not visible`. On a real change, the linked contract's `customerId` is updated in the **same transaction** (orders always have `contractId`). FE must **not** also `PATCH /contracts/:id` for this. If that contract has other orders whose customer differs from the new id → **409** code `CONTRACT_CUSTOMER_CONFLICT` and nothing is written. Does not change `value` / `deadline`. |
| `serviceId` | UUID of an existing service the caller can view (`service.view` + `ServicePolicy` scope). Unknown → **400** `Service not found`. Not visible → **404** `Service is not visible`. Does **not** auto-update `value` or `deadline`. |
| `submitterUserId` | Must be an **ACTIVE** user (**400** `Submitter must be an ACTIVE user` otherwise). Changing it (a different id than the one stored) is allowed only when the caller has `order.update` at **ALL** scope. For orders, ALL scope is `OrderPolicy`: the caller also has `order.assign`. Otherwise **400** code `SUBMITTER_IMMUTABLE`. Sending the current id is a no-op. |
| `assignedUserId` | Optional on this PATCH. Changing it requires `order.assign` (**403** `Missing permission: order.assign`). Sending the current id is a no-op and does not require `order.assign`, so a full-form save from an OWN user still persists the other fields. `POST /orders/:id/assign` is unchanged. |
| `deadline` | Date-only `YYYY-MM-DD` or `null`. Timezone: **Asia/Ho_Chi_Minh** civil day, stored as PostgreSQL `DATE` (no time-of-day). `2026-10-20` stays that calendar day; it is not a timestamp. The `order_overdue` cron compares this date. Impossible days (`2026-02-31`) → **400**. |
| `zaloGroupUrl` | `http`/`https` URL, max 500, or `null`. Persisted in column `zaloGroupLink`. Response echoes **both** `zaloGroupUrl` (FE) and `zaloGroupLink`. |
| existing fields | `value`, `totalNet`, `totalGross`, `vatRate`, `currency`, `notes`, `channel`, `collaboratorId`, `reviewerUserId`, `commissionPercent` — same omit/null rules as before. |

Response is the full order, same shape as `GET /orders/:id`, including hydrated `customerName`, `serviceName`, `submitterName`, and the fields just written.

Stable error `code` (also in `error[]` message) when the global filter wraps the body:

```json
{ "success": false, "statusCode": 400, "code": "SUBMITTER_IMMUTABLE", "error": ["…"] }
```

```json
{ "success": false, "statusCode": 409, "code": "CONTRACT_CUSTOMER_CONFLICT", "error": ["…"] }
```

Example:

```http
PATCH /api/v1/orders/{id}
Authorization: Bearer …
Content-Type: application/json

{
  "value": 3500000,
  "vatRate": 10,
  "totalNet": 3500000,
  "totalGross": 3850000,
  "notes": "Ghi chú mới",
  "commissionPercent": 10,
  "customerId": "2a33afe5-8ed9-4a0f-b643-727fddc56b91",
  "serviceId": "67ca3320-ed6c-4966-afd5-dd6d6c7bf2db",
  "submitterUserId": "fd0530f9-5f0e-43f5-b6e0-a642a08c943c",
  "deadline": "2026-10-20",
  "zaloGroupUrl": "https://zalo.me/g/example"
}
```

Clear deadline and Zalo: `{ "deadline": null, "zaloGroupUrl": null }`.

## Commands

- **assign** `{ assignedUserId }`
- **change-stage** `{ stage }` — `stage` là **string tự do** (≤50), lưu nguyên văn, không enum, không state machine. Stage custom từ catalog `crm.orderStages` dùng thẳng được.
- **approve** `{ note? }` → `approvalStatus: approved`

`reviewerUserId` set qua `PATCH /orders/:id { reviewerUserId }` (gửi `null` để xoá). Field này là metadata trên đơn; **duyệt chi** chỉ cần permission `expense.approve` — xem [`expenses.md`](./expenses.md).

`commissionPercent` là % hoa hồng **nhân viên** (`assignedUserId`), không liên quan `collaboratorPrice` hay bảng `commissions`. PATCH bỏ field thì giữ nguyên; `{ "commissionPercent": null }` xoá. Đơn cũ chưa có giá trị trả `null`.

## Payment schedule

**GET** `/orders/:orderId/payment-schedule`:
- Có lịch → `200` + schedule (`empty: false`)
- Chưa có lịch → **`200`** + `{ id: null, orderId, lines: [], empty: true }` (**không** còn 404)
- Order không tồn tại / ngoài scope → 404 / 403

**POST** body: `{ lines: [{ dueDate?, amount, sortOrder }] }` — creates or replaces schedule.
