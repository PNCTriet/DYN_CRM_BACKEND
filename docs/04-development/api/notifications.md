# Notifications API — FE contract

> **Status: LIVE** · Module: `communication` · Swagger tag: `notifications`  
> Base: `/api/v1/notifications`

Inbox rows are written by the **server** when an order is created/assigned or an expense is submitted/reviewed. There is **no** `POST /notifications` for the client.

## Permissions

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| GET | `/notifications` | `notification.view_own` | `recipientUserId = current` |
| POST | `/notifications/:id/read` | `notification.view_own` | Must be recipient |

## Types

```ts
type NotificationType =
  | 'task_assigned'
  | 'expense_pending'
  | 'expense_reviewed';

interface Notification {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  href: string | null;
  dedupeKey: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## GET `/notifications`

**Query:** `page`, `pageSize`  
Always filtered to the current user.

## POST `/:id/read`

Sets `readAt` to now. **404** if missing. **403** if the row belongs to someone else.

## When a row is created

| Event | `type` | Recipient | Skipped when |
|-------|--------|-----------|----------------|
| `POST /orders` with an assignee, or `POST /orders/:id/assign` when the assignee changes | `task_assigned` | new `assignedUserId` | assignee is the actor |
| `POST /expenses` (`PENDING`) | `expense_pending` | every `ACTIVE` user with `expense.approve` | the requester |
| `POST /expenses/:id/approve` or `reject` | `expense_reviewed` | `requestedByUserId` | requester is the reviewer |

`href` is `/orders/{id}` or `/expense-approvals`.  
Duplicate `(recipientUserId, dedupeKey)` keeps the existing row.

Not created for `PATCH /orders`, `change-stage`, or order `approve`.

Overdue / VAT / license scans are **not** implemented.
