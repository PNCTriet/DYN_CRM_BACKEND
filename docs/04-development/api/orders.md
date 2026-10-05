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
