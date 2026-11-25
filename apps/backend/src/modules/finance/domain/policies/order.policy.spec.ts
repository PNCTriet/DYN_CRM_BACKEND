import { OrderPolicy } from './order.policy';

describe('OrderPolicy', () => {
  const policy = new OrderPolicy();
  const assigneeId = 'assignee-1';
  const otherId = 'other-1';
  const record = {
    id: 'order-1',
    assignedUserId: assigneeId,
    submitterUserId: 'submitter-1',
  };

  it('OWN: assignee can view and update', () => {
    const perms = ['order.view', 'order.update'];
    expect(policy.resolveScope(perms)).toBe('OWN');
    expect(policy.canView(assigneeId, perms, record)).toBe(true);
    expect(policy.canUpdate(assigneeId, perms, record)).toBe(true);
    expect(policy.listFilter(assigneeId, perms)).toEqual({
      scope: 'OWN',
      ownerId: assigneeId,
    });
  });

  it('OWN: another user is outside the order, including the submitter', () => {
    const perms = ['order.view', 'order.update'];
    expect(policy.canView(otherId, perms, record)).toBe(false);
    expect(policy.canUpdate(otherId, perms, record)).toBe(false);
    expect(policy.canView(record.submitterUserId, perms, record)).toBe(false);
  });

  it('ALL: order.assign opens every order', () => {
    const perms = ['order.view', 'order.update', 'order.assign'];
    expect(policy.resolveScope(perms)).toBe('ALL');
    expect(policy.canView(otherId, perms, record)).toBe(true);
    expect(policy.canUpdate(otherId, perms, record)).toBe(true);
    expect(policy.listFilter(otherId, perms)).toEqual({ scope: 'ALL' });
  });
});
