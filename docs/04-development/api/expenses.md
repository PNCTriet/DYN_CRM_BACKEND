# Expenses API — FE contract

> **Status: LIVE** · Module: `finance` · Swagger tag: `expenses`  
> Base: `/api/v1/expenses`

## Permissions

| Method | Path | Permission |
|--------|------|------------|
| POST | `/expenses` | `expense.create` |
| GET | `/expenses` | `expense.view` |
| GET | `/expenses/:id` | `expense.view` |
| POST | `/expenses/:id/approve` | `expense.approve` |
| POST | `/expenses/:id/reject` | `expense.approve` |

---

## Types

```ts
type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Expense {
  id: string;
  orderId: string;
  title: string;
  amount: string;
  currency: string;
  note: string | null;
  payeeName: string | null;
  description: string | null;
  incurredOn: string | null;
  ctvRelated: boolean;
  status: ExpenseStatus;
  requestedByUserId: string;
  requestedAt: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## POST `/expenses`

Required: `orderId`, `title`, `amount`.  
Optional: `currency` (VND), `note`, `payeeName`, `description`, `incurredOn`, `ctvRelated`.

## GET `/expenses`

**Query:** `page`, `pageSize`, `orderId`

## Commands

- **approve** / **reject** `{ note? }` — only from PENDING

**Business rule:** người duyệt phải đúng là `order.reviewerUserId` của đơn chứa expense.  
`expense.approve` **không** đủ để duyệt hộ người khác.

| Trường hợp | Kết quả |
|------------|---------|
| `currentUser.id === order.reviewerUserId` | duyệt được |
| Khác reviewer | **403** `Only the reviewer assigned to this order can review its expenses` |
| Đơn chưa có reviewer (`null`) | **400** — set trước bằng `PATCH /orders/:id { reviewerUserId }` |
