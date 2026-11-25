# Notifications API — FE contract

> **Status: LIVE** (category, unread count, and the remaining types ship with migration `20261120040000_notification_category_unread_index`)  
> Module: `communication` · Swagger tag: `notifications`  
> Base: `/api/v1/notifications`

Inbox rows are written by the **server**. There is **no** `POST /notifications`.

Sidebar mapping and copy-paste prompt: [`FRONTEND_HANDOFF_NOTIFICATIONS.md`](./FRONTEND_HANDOFF_NOTIFICATIONS.md).

## Permissions

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| GET | `/notifications` | `notification.view_own` | `recipientUserId = current` |
| GET | `/notifications/unread-count` | `notification.view_own` | current user |
| POST | `/notifications/:id/read` | `notification.view_own` | must be recipient |
| POST | `/notifications/read-all` | `notification.view_own` | own unread rows |
| POST | `/notifications/scan` | `config.manage` | runs the daily job once |

## Types and categories

```ts
type NotificationCategory =
  | 'orders'
  | 'expenses'
  | 'payments'
  | 'vat'
  | 'licenses'
  | 'users'
  | 'emails';

type NotificationType =
  | 'task_assigned'
  | 'order_mentioned'
  | 'order_overdue'
  | 'expense_pending'
  | 'expense_reviewed'
  | 'payment_overdue'
  | 'vat_deadline_approaching'
  | 'vat_overdue'
  | 'license_expiring'
  | 'user_pending'
  | 'user_approved'
  | 'email_sent'
  | 'email_failed';

interface Notification {
  id: string;
  recipientUserId: string;
  type: NotificationType | string;
  category: NotificationCategory;
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

| `category` | Types | Sidebar |
|------------|-------|---------|
| `orders` | `task_assigned`, `order_mentioned`, `order_overdue` | Quản lý đơn hàng `/orders` |
| `expenses` | `expense_pending`, `expense_reviewed` | Đề nghị thanh toán `/expense-approvals` |
| `payments` | `payment_overdue` | Quản lý thanh toán `/payments` |
| `vat` | `vat_deadline_approaching`, `vat_overdue` | Quản lý VAT `/vat` |
| `licenses` | `license_expiring` | no menu item; href `/orders/:id` |
| `users` | `user_pending`, `user_approved` | Quản lý người dùng `/users` |
| `emails` | `email_sent`, `email_failed` | Quản lý email `/emails` |

## GET `/notifications`

**Query:** `page`, `pageSize`, optional `category` (one of the seven keys).  
Always filtered to the current user. Unknown `category` → **400**.

## GET `/notifications/unread-count`

```json
{
  "total": 0,
  "byCategory": {
    "orders": 0,
    "expenses": 0,
    "payments": 0,
    "vat": 0,
    "licenses": 0,
    "users": 0,
    "emails": 0
  }
}
```

All seven keys are present. One grouped query on unread rows for the current user. Index: `(recipient_user_id, read_at)`.

## POST `/:id/read`

Sets `readAt` to now. **404** if missing. **403** if the row belongs to someone else.

## POST `/read-all`

**Query:** optional `category`.  
Marks the current user's unread rows read (one category, or all). Response: `{ "updated": n }`.

## POST `/scan`

Runs the same job as the 07:00 `Asia/Ho_Chi_Minh` cron. Safe to call again: dedupe keys prevent a second insert the same civil day.

```json
{
  "civilDate": "2026-11-20",
  "timeZone": "Asia/Ho_Chi_Minh",
  "candidates": 4,
  "inserted": 4,
  "existing": 0
}
```

Optional env `NOTIFICATION_SCAN_ENABLED=false` disables the cron only. This endpoint still runs.

## When a row is created

| Event | `type` | Recipient | Skipped when |
|-------|--------|-----------|----------------|
| `POST /orders` with an assignee, or `POST /orders/:id/assign` when the assignee changes | `task_assigned` | new `assignedUserId` | assignee is the actor |
| `POST /notes` with `subjectType=ORDER` | `order_mentioned` | each `mentionedUserIds` entry who can view the order | the author; inactive users; users without `order.view` or outside OrderPolicy scope. One row per recipient. `PATCH /notes/:id` does not emit again |
| `POST /expenses` (`PENDING`) | `expense_pending` | every `ACTIVE` user with `expense.approve` | the requester |
| `POST /expenses/:id/approve` or `reject` | `expense_reviewed` | `requestedByUserId` | requester is the reviewer |
| Daily 07:00, processing `deadline` before today | `order_overdue` | assignee | no deadline; stage completed or cancelled; assignee not ACTIVE |
| Daily 07:00, VAT deadline inside the warn window | `vat_deadline_approaching` | assignee | no `needsVat`; ISSUED invoice; cancelled; outside the window |
| Daily 07:00, VAT deadline before today | `vat_overdue` | assignee | no `needsVat`; ISSUED invoice; cancelled |
| Daily 07:00, unpaid schedule line due before today | `payment_overdue` | assignee | paid in full; not yet due; cancelled. Completed orders still alert |
| Daily 07:00, license file expiry inside N months | `license_expiring` | assignee | no `license\|issued\|expires` file; earliest date already past; cancelled |
| Google sign-up creates `PENDING_APPROVAL` | `user_pending` | ACTIVE users with `user.manage` | password signup; `POST /users`; repeat login |
| `PATCH /users/:id` `PENDING_APPROVAL` → `ACTIVE` | `user_approved` | that user | already ACTIVE; create-as-ACTIVE |
| MailPort delivery log `SENT` | `email_sent` | actor, else `recipientUserId` | preference skip; nobody to notify |
| MailPort delivery log `FAILED` | `email_failed` | actor, else `recipientUserId` | preference skip; nobody to notify |

`href` is set on every row (order, `/orders/{id}?tab=notes` for `order_mentioned`, `/expense-approvals`, `/payments/:orderId`, `/users/pending`, `/dashboard`, or `/emails`).  
Duplicate `(recipientUserId, dedupeKey)` keeps the existing row. `order_mentioned` uses `order_mentioned:{noteId}:{recipientUserId}`.

Title: `{authorName} nhắc bạn trong đơn {orderNumber}`. Body is the note content, trimmed and cut at 120 characters. Inbox failure does not roll back the note. Contract for the note payload and `GET /users/directory`: [crm-extras.md](./crm-extras.md).

Daily dedupe keys end with the civil date (`order_overdue:<orderId>:2026-11-20`) so the next morning can remind again. Event keys do not (`user_pending:<userId>`, `email_sent:<logId>`).

Not created for `PATCH /orders`, `change-stage`, order `approve`, `PATCH /notes/:id`, CUSTOMER/LEAD notes, or `POST /reminders`.

VAT window: config key `crm.reminders` → `vatIssueWarnDays` (default 30, clamp 7–90).  
License window: `service.customFields.licenseExpiryWarnMonths` (default 2, clamp 1–24), compared to the earliest `license|{issuedAt}|{expiresAt}` file on the order. `serviceEnd` is not used.
