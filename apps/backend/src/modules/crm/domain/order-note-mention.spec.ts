import { categoryForType, NOTIFICATION_TYPES } from '../../communication/domain/notification-category';
import { OrderPolicy } from '../../finance/domain/policies/order.policy';
import {
  ORDER_MENTION_BODY_MAX,
  dedupeUserIds,
  orderMentionDedupeKey,
  orderMentionHref,
  orderMentionTitle,
  selectOrderMentionRecipients,
  truncateNoteContent,
  type MentionAccess,
} from './order-note-mention';

const order = {
  id: 'order-1',
  assignedUserId: 'assignee',
  submitterUserId: 'submitter',
};

function user(
  id: string,
  permissions: string[],
  status = 'ACTIVE',
  deletedAt: Date | null = null,
): MentionAccess {
  return { id, status, deletedAt, permissions };
}

describe('order mention recipients', () => {
  const policy = new OrderPolicy();

  it('drops the actor, inactive users, users without order.view, and users outside scope', () => {
    const recipients = selectOrderMentionRecipients({
      actorUserId: 'author',
      mentionedUserIds: [
        'author',
        'author',
        'assignee',
        'assignee',
        'manager',
        'no-view',
        'own-other',
        'inactive',
        'deleted',
        'assign-only',
        'missing',
      ],
      users: [
        user('author', ['order.view', 'order.update']),
        user('assignee', ['order.view']),
        user('manager', ['order.view', 'order.assign']),
        user('no-view', ['order.update']),
        user('own-other', ['order.view']),
        user('inactive', ['order.view', 'order.assign'], 'SUSPENDED'),
        user('deleted', ['order.view', 'order.assign'], 'ACTIVE', new Date()),
        user('assign-only', ['order.assign']),
      ],
      order,
      policy,
    });

    expect(recipients).toEqual(['assignee', 'manager']);
  });

  it('dedupes ids and builds one key per note and recipient', () => {
    expect(dedupeUserIds(['b', 'a', 'b', '', 'a'])).toEqual(['b', 'a']);
    expect(orderMentionDedupeKey('note-1', 'user-2')).toBe(
      'order_mentioned:note-1:user-2',
    );
    expect(orderMentionHref('order-1')).toBe('/orders/order-1?tab=notes');
    expect(orderMentionTitle('Minh', 'DH-1042')).toBe(
      'Minh nhắc bạn trong đơn DH-1042',
    );
  });

  it('truncates the body on code points', () => {
    expect(truncateNoteContent('  xin chào  ')).toBe('xin chào');
    expect(truncateNoteContent('   ')).toBeNull();
    const long = 'ạ'.repeat(ORDER_MENTION_BODY_MAX + 5);
    const body = truncateNoteContent(long);
    expect(Array.from(body ?? '')).toHaveLength(ORDER_MENTION_BODY_MAX);
    expect(body?.endsWith('…')).toBe(true);
  });

  it('counts order_mentioned on the orders badge', () => {
    expect(NOTIFICATION_TYPES).toContain('order_mentioned');
    expect(categoryForType('order_mentioned')).toBe('orders');
  });
});
