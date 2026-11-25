import { OrderPolicy, OrderScopeRecord } from '../../finance/domain/policies/order.policy';

/** Notification body keeps the start of the note and marks a cut with an ellipsis. */
export const ORDER_MENTION_BODY_MAX = 120;

export type MentionAccess = {
  id: string;
  status: string;
  deletedAt?: Date | null;
  permissions: string[];
};

export function dedupeUserIds(ids: readonly string[] | undefined): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Who receives `order_mentioned` for one note.
 * The actor, inactive or deleted users, and anyone who cannot open the order
 * are left out. Duplicate ids collapse to one recipient.
 */
export function selectOrderMentionRecipients(input: {
  actorUserId: string;
  mentionedUserIds: readonly string[];
  users: readonly MentionAccess[];
  order: OrderScopeRecord;
  policy?: OrderPolicy;
}): string[] {
  const policy = input.policy ?? new OrderPolicy();
  const byId = new Map(input.users.map((user) => [user.id, user]));
  const recipients: string[] = [];
  for (const id of dedupeUserIds(input.mentionedUserIds)) {
    if (id === input.actorUserId) continue;
    const user = byId.get(id);
    if (!user || user.deletedAt) continue;
    if (user.status !== 'ACTIVE') continue;
    if (!user.permissions.includes('order.view')) continue;
    if (!policy.canView(user.id, user.permissions, input.order)) continue;
    recipients.push(id);
  }
  return recipients;
}

export function orderMentionDedupeKey(noteId: string, recipientUserId: string): string {
  return `order_mentioned:${noteId}:${recipientUserId}`;
}

export function orderMentionTitle(authorName: string, orderNumber: string): string {
  return `${authorName} nhắc bạn trong đơn ${orderNumber}`;
}

export function orderMentionHref(orderId: string): string {
  return `/orders/${orderId}?tab=notes`;
}

export function truncateNoteContent(
  content: string,
  max = ORDER_MENTION_BODY_MAX,
): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  if (chars.length <= max) return trimmed;
  return `${chars.slice(0, max - 1).join('')}…`;
}
