# Orders API — FE contract

> **Status: LIVE** · Module: `finance` · Swagger tag: `orders`  
> Base: `/api/v1/orders`

## Permissions

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| POST | `/orders` | `order.create` | — |
| GET | `/orders` | `order.view` | OWN → `assignedUserId`; ALL if `order.assign` |
| GET | `/orders/:id` | `order.view` | Must be in scope |
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
| vatRate | no | `10` |
| currency | no | `VND` |
| stage | no | `new` |
| notes | no | — |

---

## Commands

- **assign** `{ assignedUserId }`
- **change-stage** `{ stage }` — `stage` là **string tự do** (≤50), lưu nguyên văn, không enum, không state machine. Stage custom từ catalog `crm.orderStages` dùng thẳng được.
- **approve** `{ note? }` → `approvalStatus: approved`

`reviewerUserId` set qua `PATCH /orders/:id { reviewerUserId }` (gửi `null` để xoá). Đây là người **duy nhất** được duyệt expense của đơn — xem [`expenses.md`](./expenses.md).

## Payment schedule

**POST** body: `{ lines: [{ dueDate?, amount, sortOrder }] }` — creates or replaces schedule.
