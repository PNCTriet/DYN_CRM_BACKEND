import { CustomerPolicy } from './customer.policy';

describe('CustomerPolicy', () => {
  const policy = new CustomerPolicy();
  const ownerId = 'owner-1';
  const otherId = 'other-1';
  const record = { id: 'c1', ownerId };

  it('OWN: allows own record', () => {
    const perms = ['customer.view', 'customer.update'];
    expect(policy.canView(ownerId, perms, record)).toBe(true);
    expect(policy.canUpdate(ownerId, perms, record)).toBe(true);
  });

  it('OWN: denies another user record', () => {
    const perms = ['customer.view', 'customer.update'];
    expect(policy.canView(otherId, perms, record)).toBe(false);
    expect(policy.canUpdate(otherId, perms, record)).toBe(false);
  });

  it('TEAM: allows other user record when assign present', () => {
    const perms = ['customer.view', 'customer.update', 'customer.assign'];
    expect(policy.canView(otherId, perms, record)).toBe(true);
    expect(policy.resolveScope(perms)).toBe('TEAM');
  });

  it('ALL: allows when assign+delete+export', () => {
    const perms = [
      'customer.view',
      'customer.assign',
      'customer.delete',
      'customer.export',
    ];
    expect(policy.resolveScope(perms)).toBe('ALL');
    expect(policy.canView(otherId, perms, record)).toBe(true);
  });

  it('listFilter OWN includes ownerId', () => {
    expect(policy.listFilter(ownerId, ['customer.view'])).toEqual({
      scope: 'OWN',
      ownerId,
    });
  });
});
