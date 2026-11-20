# CRM extras — Followers / Notes / Activities

> **Status: LIVE** (CUSTOMER/LEAD notes reuse `customer.*`. ORDER notes use `order.view` / `order.update` plus OrderPolicy scope.)

## Followers

| Method | Path | Permission |
|--------|------|------------|
| GET | `/customers/:customerId/followers` | `customer.view` |
| POST | `/customers/:customerId/followers` | `customer.update` body `{ userId }` |
| DELETE | `/customers/:customerId/followers/:userId` | `customer.update` |

## Notes

Migration `20261120160000_note_mentions` adds `note_mentions(note_id, user_id)`. Apply it before serving ORDER notes.

| Method | Path | CUSTOMER / LEAD | ORDER |
|--------|------|-----------------|-------|
| POST | `/notes` | `customer.update` | `order.update` and OrderPolicy scope |
| GET | `/notes?subjectType=&subjectId=` | `customer.view` | `order.view` and OrderPolicy scope |
| PATCH | `/notes/:id` | `customer.update` | author, **or** `order.update` inside scope |
| DELETE | `/notes/:id` | `customer.update` | author, **or** `order.update` inside scope |

`subjectType` is exact: `CUSTOMER`, `LEAD`, or `ORDER`. `subjectId` for an order note is the order id.

OrderPolicy scope matches `/orders`: **OWN** is `assignedUserId` (no `order.assign`); **ALL** when the caller has `order.assign`. A note id alone is not enough to change an ORDER note. CUSTOMER and LEAD stay on `customer.*` with no order scope check.

### Create body

```ts
{
  subjectType: 'CUSTOMER' | 'LEAD' | 'ORDER';
  subjectId: string; // uuid
  content: string; // max 10000
  mentionedUserIds?: string[]; // ORDER only
}
```

`mentionedUserIds` is deduped. Each id must be an existing `ACTIVE` user (soft-deleted and any other status → **400**). Non-empty `mentionedUserIds` on CUSTOMER or LEAD → **400**. Unknown order id → **404**. Missing note id → **404**. Missing permission → **403** `Missing permission: …`. Order outside scope → **403** `Outside data scope`.

PATCH body is `{ content }` only. Mentions are not edited, and PATCH does not send another notification. DELETE is **204**.

### Note JSON

GET returns an array, newest `createdAt` first. POST and PATCH return one object.

```ts
{
  id: string;
  subjectType: string;
  subjectId: string;
  content: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  mentionedUserNames: string[]; // same order as mentionedUserIds
  createdAt: string;
  updatedAt: string;
}
```

Names and ids are sorted by user id. Notes with no mentions return empty arrays. `authorName` is `""` when the author row is gone.

### Mention notification

After an ORDER note is saved, the server writes one `order_mentioned` row per mentioned user (category `orders`). Failure to write the inbox does **not** roll back the note. No notification on CUSTOMER/LEAD, and none on PATCH.

Skipped recipients: the author, users who are not `ACTIVE`, and users who cannot view that order (`order.view` plus the same OWN/ALL scope). A mention is still stored for an active user who cannot view the order; they just get no bell row.

| Field | Value |
|-------|--------|
| `type` | `order_mentioned` |
| `category` | `orders` |
| `title` | `{authorName} nhắc bạn trong đơn {orderNumber}` |
| `body` | trimmed content, cut at 120 characters with `…` |
| `href` | `/orders/{orderId}?tab=notes` |
| `dedupeKey` | `order_mentioned:{noteId}:{recipientUserId}` |
| `sourceType` / `sourceId` | `order` / order id |

### Mention picker

`GET /users/directory?q=` — permission `order.view` (not `user.manage`).

Returns at most 50 `ACTIVE` users, `deletedAt` null, ordered by `displayName`. `q` is an optional case-insensitive match on `displayName` or `email`.

```ts
{ id: string; displayName: string; email: string | null }[]
```

The directory is not filtered by who can open a particular order.

## Activities

| Method | Path | Permission |
|--------|------|------------|
| POST | `/activities` | `customer.update` |
| GET | `/activities?subjectType=&subjectId=` | `customer.view` |

Body create: `{ subjectType, subjectId, type: 'CALL'|…, payload?, occurredAt? }`

## Not yet

- Import batches (`import_batches` / `import_rows`) — Phase C7  
- Dedicated `note.*` / `activity.*` permissions (OPEN)  
