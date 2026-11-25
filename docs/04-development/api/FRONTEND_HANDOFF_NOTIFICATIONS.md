# Frontend handoff — inbox, categories, unread badges (2026-11-20)

> Copy **§ Prompt**.  
> API: `https://apidyn.otcayxe.com/api/v1` · Contract: [`notifications.md`](./notifications.md)

Backend writes every inbox row. There is still **no** `POST /notifications`. After this deploy the daily scan and the user/email events are live, and the bell can use `GET /notifications/unread-count`.

Migration `20261120040000_notification_category_unread_index` adds `notifications.category` and index `(recipient_user_id, read_at)`. Apply it on the API database before the new process boots. Do not expect old rows to have `category` until that migration runs.

## Category ↔ CRM-DNY-UI sidebar

Checked against `apps/web/src/components/layout/app-shell.tsx` and `SYSTEM_PAGES` (`apps/web/src/lib/types.ts`). Badge key is `category`. It is not always the route path.

| `category` | Sidebar label (vi) | i18n | Route the badge belongs to | Types |
|------------|--------------------|------|-----------------------------|-------|
| `orders` | Quản lý đơn hàng | `nav.orders` | `/orders` | `task_assigned`, `order_mentioned`, `order_overdue` |
| `expenses` | Đề nghị thanh toán | `nav.expenses` | `/expense-approvals` | `expense_pending`, `expense_reviewed` |
| `payments` | Quản lý thanh toán | `nav.payments` | `/payments` | `payment_overdue` |
| `vat` | Quản lý VAT | `nav.vat` | `/vat` | `vat_deadline_approaching`, `vat_overdue` |
| `licenses` | *(no menu item)* | — | bell opens `/orders/:id` | `license_expiring` |
| `users` | Quản lý người dùng | `nav.users` | `/users`, `/users/pending` | `user_pending`, `user_approved` |
| `emails` | Quản lý email | `nav.emails` | `/emails` | `email_sent`, `email_failed` |

`licenses` is its own bucket because giấy phép is not a sidebar section. Put that count on the bell, not on a missing menu row. Orders, customers, payroll, services, config, and the guide have no notification category.

`byCategory` always contains all seven keys. Missing ones are `0`.

## Endpoints

Permission for inbox routes: `notification.view_own`. Rows are always the current user.

| Method | Path | What |
|--------|------|------|
| GET | `/notifications?page&pageSize&category` | Own inbox. `category` optional, one of the seven keys. Unknown category → 400. |
| GET | `/notifications/unread-count` | `{ "total": n, "byCategory": { "orders": n, "expenses": n, "payments": n, "vat": n, "licenses": n, "users": n, "emails": n } }` |
| POST | `/notifications/:id/read` | Sets `readAt`. 404 if missing. 403 if not the recipient. |
| POST | `/notifications/read-all?category` | Marks own unread rows read. `category` optional. `{ "updated": n }`. |
| POST | `/notifications/scan` | Manual run of the 07:00 job. Permission `config.manage`. Idempotent. |

Unread count is one `GROUP BY category` for `recipient_user_id = me AND read_at IS NULL`.

```json
{
  "total": 2,
  "byCategory": {
    "orders": 1,
    "expenses": 0,
    "payments": 0,
    "vat": 1,
    "licenses": 0,
    "users": 0,
    "emails": 0
  }
}
```

`total` is every unread row for this user (the seven categories cover every type).

Notification JSON now includes `category`:

```json
{
  "id": "<uuid>",
  "recipientUserId": "<uuid>",
  "type": "order_overdue",
  "category": "orders",
  "title": "Đơn DH-001 quá hạn xử lý",
  "body": "Công ty A — Thành lập DN · Hạn 2026-11-19",
  "readAt": null,
  "sourceType": "order",
  "sourceId": "<order uuid>",
  "href": "/orders/<order uuid>",
  "dedupeKey": "order_overdue:<order uuid>:2026-11-20",
  "createdAt": "2026-11-20T00:00:00.000Z",
  "updatedAt": "2026-11-20T00:00:00.000Z"
}
```

Use `href` for the click. Use `category` for the badge. Do not rebuild title text on the client.

## Types, recipients, dedupe

Dates below are civil days in **Asia/Ho_Chi_Minh**. The job runs at **07:00** that zone (`0 7 * * *`). A deadline of today is not overdue yet; it becomes overdue the next morning. Running the job twice the same morning does not insert again. The next morning can insert again while the condition is still true.

| `type` | `category` | When | Recipient | Not sent when | `dedupeKey` | `href` |
|--------|------------|------|-----------|---------------|-------------|--------|
| `task_assigned` | orders | `POST /orders` with an assignee, or `POST /orders/:id/assign` when the assignee changes | new `assignedUserId` | assignee is the actor | `task_assigned:<orderId>` | `/orders/<orderId>` |
| `order_mentioned` | orders | `POST /notes` `subjectType=ORDER` | each mentioned user who can view the order | author; inactive; no `order.view`; outside OWN/ALL scope. Not sent again on PATCH | `order_mentioned:<noteId>:<recipientUserId>` | `/orders/<orderId>?tab=notes` |
| `expense_pending` | expenses | `POST /expenses` (`PENDING`) | every ACTIVE user with `expense.approve` | the requester | `expense_pending:<expenseId>` | `/expense-approvals` |
| `expense_reviewed` | expenses | approve or reject | `requestedByUserId` | requester is the reviewer | `expense_reviewed:<expenseId>` | `/expense-approvals` |
| `order_overdue` | orders | daily, `deadline < today`, stage not completed/cancelled | assignee if ACTIVE | no deadline; completed; cancelled | `order_overdue:<orderId>:<YYYY-MM-DD>` | `/orders/<orderId>` |
| `vat_deadline_approaching` | vat | daily, `needsVat`, no ISSUED invoice, `0 <= deadline-today <= warnDays` | assignee if ACTIVE | invoice already ISSUED; cancelled order | `vat_deadline_approaching:<orderId>:<YYYY-MM-DD>` | `/orders/<orderId>` |
| `vat_overdue` | vat | daily, `needsVat`, no ISSUED invoice, `deadline < today` | assignee if ACTIVE | invoice ISSUED; cancelled order | `vat_overdue:<orderId>:<YYYY-MM-DD>` | `/orders/<orderId>` |
| `payment_overdue` | payments | daily, schedule line `dueDate < today` and recorded/verified payments do not cover the line | assignee if ACTIVE | due today or later; fully paid; cancelled order. Completed orders still alert. | `payment_overdue:<lineId>:<YYYY-MM-DD>` | `/payments/<orderId>` |
| `license_expiring` | licenses | daily, earliest license file expiry is today through today + N months | assignee if ACTIVE | no dated license file; earliest expiry already past; cancelled order. Completed orders still alert. | `license_expiring:<orderId>:<YYYY-MM-DD>` | `/orders/<orderId>` |
| `user_pending` | users | Google sign-up creates `PENDING_APPROVAL` | ACTIVE users with `user.manage` | password signup; admin `POST /users`; a later Google login of the same user | `user_pending:<userId>` | `/users/pending` |
| `user_approved` | users | `PATCH /users/:id` status `PENDING_APPROVAL` → `ACTIVE` | that user | create-as-ACTIVE; renaming a pending user; setting ACTIVE when they were already ACTIVE | `user_approved:<userId>` | `/dashboard` |
| `email_sent` | emails | Resend MailPort log `SENT` | user who triggered the send, else `recipientUserId` | preference skip (`SKIPPED`); no actor and no recipient user | `email_sent:<logId>` | `/emails` |
| `email_failed` | emails | Resend MailPort log `FAILED` | same as `email_sent` | skip path | `email_failed:<logId>` | `/emails` |

VAT warn days come from app config `crm.reminders.vatIssueWarnDays` (default 30, clamp 7–90), same as the UI. License months come from `service.customFields.licenseExpiryWarnMonths` (default 2, clamp 1–24). License dates are read from `document_metadata.file_type` encoded `license|{issuedAt}|{expiresAt}`. `serviceEnd` is not a license expiry. If the earliest license date is already past, that is expired and this job does not emit `license_expiring` (there is no `license_expired` type).

Not created for `PATCH /orders`, `POST /orders/:id/change-stage`, `POST /orders/:id/approve`, `PATCH /notes/:id`, CUSTOMER/LEAD notes, admin create of an already-ACTIVE user, or `POST /reminders`.

`order_mentioned` title is `{authorName} nhắc bạn trong đơn {orderNumber}` (for example `Minh nhắc bạn trong đơn DH-1042`). Body is the note text, trimmed, at most 120 characters, with `…` when it is cut. The orders sidebar badge counts it because `category` is `orders`. A failed inbox write does not remove the note.

## Trao đổi trên đơn — notes ORDER

Migration `20261120160000_note_mentions` (table `note_mentions`). Same `/notes` routes. CUSTOMER and LEAD stay on `customer.view` / `customer.update`.

| Call | ORDER permission | Scope |
|------|------------------|-------|
| `GET /notes?subjectType=ORDER&subjectId={orderId}` | `order.view` | OrderPolicy OWN (`assignedUserId`) or ALL (`order.assign`) |
| `POST /notes` | `order.update` | same scope |
| `PATCH /notes/:id` | author, or `order.update` | non-authors must be inside scope. A note id alone is not access |
| `DELETE /notes/:id` | author, or `order.update` | same as PATCH. **204** |

Create body: `{ subjectType: "ORDER", subjectId, content, mentionedUserIds?: uuid[] }`. Ids are deduped and must be existing `ACTIVE` users, otherwise **400**. Do not send `mentionedUserIds` on CUSTOMER/LEAD.

List is an array, newest first. Each note:

```ts
{
  id: string;
  subjectType: string;
  subjectId: string;
  content: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  mentionedUserNames: string[];
  createdAt: string;
  updatedAt: string;
}
```

PATCH body is `{ content }` only. It does not change mentions and does not emit `order_mentioned` again.

Mention picker: `GET /users/directory?q=` with `order.view` (not `user.manage`). Response is at most 50 rows, `ACTIVE` only: `{ id, displayName, email }`. `email` may be null. `q` matches display name or email. The list is not limited to people who can open the current order; the server stores the mention and skips the bell when that person cannot view the order.

There is still no `POST /notifications`, no order-follower API, and no parsing of `@Name` out of the text. Send `mentionedUserIds` explicitly.

Duplicate `(recipientUserId, dedupeKey)` keeps the existing row.

## § Prompt (copy)

```text
Bạn là Frontend lead (Next.js) của DYN CRM (CRM-DNY-UI).
Backend ghi inbox. KHÔNG có POST /notifications.

Contract: docs/04-development/api/notifications.md
Handoff: docs/04-development/api/FRONTEND_HANDOFF_NOTIFICATIONS.md
API: https://apidyn.otcayxe.com/api/v1

## Giữ
- GET /notifications?page&pageSize&category — inbox user hiện tại (notification.view_own).
- POST /notifications/:id/read — 404 thì bỏ qua; 403 nếu không phải recipient.
- Sau POST /orders, POST /orders/:id/assign, POST /expenses, approve/reject expense → refetch inbox.

## Mới
- GET /notifications/unread-count → { total, byCategory }.
  byCategory luôn có orders, expenses, payments, vat, licenses, users, emails (0 nếu không có).
- POST /notifications/read-all?category — đánh dấu đã đọc của user hiện tại. category tùy chọn.
- Mỗi row có category. Badge sidebar theo bảng handoff.
  licenses KHÔNG có mục menu. expenses gắn /expense-approvals (nav.expenses), không phải /expenses.
- Bấm chuông dùng href, đừng tự dựng title.

## Type
task_assigned, order_overdue → orders, href /orders/{id}
order_mentioned → orders, href /orders/{orderId}?tab=notes
  title: "{authorName} nhắc bạn trong đơn {orderNumber}"
  Sau POST /notes subjectType=ORDER, refetch inbox của người được nhắc (không phải tác giả, không phải user không xem được đơn).
  PATCH /notes không tạo notif mới.
expense_pending, expense_reviewed → expenses, href /expense-approvals
payment_overdue → payments, href /payments/{orderId}
vat_deadline_approaching, vat_overdue → vat, href /orders/{id}
license_expiring → licenses, href /orders/{id}
user_pending → users, href /users/pending (người có user.manage)
user_approved → users, href /dashboard (user vừa được duyệt)
email_sent, email_failed → emails, href /emails

Job 07:00 Asia/Ho_Chi_Minh đã có. Đừng quét cảnh báo trên client.
PATCH /orders, change-stage, approve order KHÔNG tạo notif.
POST /users tạo staff ACTIVE KHÔNG tạo user_pending.

## Notes ORDER + directory
- GET /notes?subjectType=ORDER&subjectId={orderId} — order.view, đúng scope OWN/ALL. Mới nhất trước.
- POST /notes { subjectType:"ORDER", subjectId, content, mentionedUserIds } — order.update + scope.
- Response: id, subjectType, subjectId, content, authorUserId, authorName, mentionedUserIds, mentionedUserNames, createdAt, updatedAt.
- PATCH/DELETE ORDER: tác giả, hoặc order.update trong scope. Không sửa chỉ vì biết id.
- CUSTOMER/LEAD giữ customer.view / customer.update. Không gửi mentionedUserIds cho hai loại đó.
- GET /users/directory?q= — order.view, tối đa 50 user ACTIVE: { id, displayName, email }. Không dùng user.manage.

## Acceptance
- [ ] GET unread-count trả đủ 7 category, 0 khi trống. Mark-read một dòng hoặc read-all?category làm total và byCategory giảm.
- [ ] POST /notes ORDER nhắc user khác xem được đơn → user đó thấy order_mentioned, category orders, href /orders/{id}?tab=notes. Tác giả, user inactive, user không xem được đơn không có row. Gọi lại cùng note không nhân đôi (dedupeKey order_mentioned:{noteId}:{userId}).
- [ ] GET /users/directory với order.view trả user ACTIVE. user.manage không bắt buộc.
- [ ] GET /notifications?category=vat chỉ trả VAT của user đó.
- [ ] Assignee thấy order_overdue / vat_* / payment_overdue / license_expiring sau job (hoặc POST /notifications/scan bởi người có config.manage). Chạy lại cùng ngày không nhân đôi.
- [ ] Google sign-up PENDING_APPROVAL → user có user.manage thấy user_pending. PATCH status ACTIVE → user đó thấy user_approved. Tạo user ACTIVE bằng admin thì không có user_pending.
- [ ] Gửi email thành công/thất bại → người bấm gửi thấy email_sent / email_failed. Email bị tắt preference thì không có row.
- [ ] Reload vẫn còn row. Không còn scanner client. Không còn id n-…
```
