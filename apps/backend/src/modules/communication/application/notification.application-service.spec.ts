import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { NOTIFICATION_CATEGORIES } from '../domain/notification-category';
import { NotificationRepository } from '../infrastructure/prisma/notification.repository';
import { NotificationApplicationService } from './notification.application-service';

type Row = {
  id: string;
  recipientUserId: string;
  type: string;
  category: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  sourceType: string | null;
  sourceId: string | null;
  href: string | null;
  dedupeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function row(partial: Pick<Row, 'id' | 'recipientUserId' | 'type' | 'category'> & Partial<Row>): Row {
  return {
    title: partial.type,
    body: null,
    readAt: null,
    sourceType: null,
    sourceId: null,
    href: null,
    dedupeKey: null,
    createdAt: new Date('2026-11-20T00:00:00.000Z'),
    updatedAt: new Date('2026-11-20T00:00:00.000Z'),
    ...partial,
  };
}

describe('NotificationApplicationService unread counts', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'a@b.c',
    displayName: 'A',
    status: 'ACTIVE',
    permissions: ['notification.view_own'],
    roleCodes: ['SALES'],
  };

  function setup() {
    const rows: Row[] = [
      row({ id: 'n1', recipientUserId: 'user-1', type: 'task_assigned', category: 'orders' }),
      row({ id: 'n2', recipientUserId: 'user-1', type: 'expense_pending', category: 'expenses' }),
      row({ id: 'n3', recipientUserId: 'user-1', type: 'vat_overdue', category: 'vat' }),
      row({
        id: 'n4',
        recipientUserId: 'user-1',
        type: 'email_sent',
        category: 'emails',
        readAt: new Date('2026-11-20T01:00:00.000Z'),
      }),
      row({ id: 'n5', recipientUserId: 'other', type: 'task_assigned', category: 'orders' }),
    ];
    const repo = {
      findMany: jest.fn(async (params: { recipientUserId: string; category?: string; skip: number; take: number }) => {
        const filtered = rows.filter(
          (item) =>
            item.recipientUserId === params.recipientUserId &&
            (!params.category || item.category === params.category),
        );
        return [filtered.slice(params.skip, params.skip + params.take), filtered.length] as const;
      }),
      findById: jest.fn(async (id: string) => rows.find((item) => item.id === id) ?? null),
      markRead: jest.fn(async (id: string) => {
        const found = rows.find((item) => item.id === id);
        if (!found) throw new Error('missing');
        found.readAt = new Date('2026-11-20T02:00:00.000Z');
        return found;
      }),
      markAllRead: jest.fn(async (recipientUserId: string, category?: string) => {
        let count = 0;
        for (const item of rows) {
          if (item.recipientUserId !== recipientUserId || item.readAt) continue;
          if (category && item.category !== category) continue;
          item.readAt = new Date('2026-11-20T03:00:00.000Z');
          count += 1;
        }
        return { count };
      }),
      countUnreadByCategory: jest.fn(async (recipientUserId: string) => {
        const counts = new Map<string, number>();
        for (const item of rows) {
          if (item.recipientUserId !== recipientUserId || item.readAt) continue;
          counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        }
        return [...counts.entries()].map(([category, count]) => ({
          category,
          _count: { _all: count },
        }));
      }),
    };
    return {
      rows,
      service: new NotificationApplicationService(repo as unknown as NotificationRepository),
    };
  }

  it('returns every sidebar category, with zero when the user has none unread', async () => {
    const { service } = setup();
    const count = await service.unreadCount(user);
    expect(count.total).toBe(3);
    expect(Object.keys(count.byCategory).sort()).toEqual(
      [...NOTIFICATION_CATEGORIES].sort(),
    );
    expect(count.byCategory).toEqual({
      orders: 1,
      expenses: 1,
      payments: 0,
      vat: 1,
      licenses: 0,
      users: 0,
      emails: 0,
    });
  });

  it('drops counts when one row or one category is marked read', async () => {
    const { service } = setup();
    await service.markRead(user, 'n1');
    expect(await service.unreadCount(user)).toMatchObject({
      total: 2,
      byCategory: { orders: 0, expenses: 1, vat: 1 },
    });

    await service.markAllRead(user, 'expenses');
    const after = await service.unreadCount(user);
    expect(after.total).toBe(1);
    expect(after.byCategory.expenses).toBe(0);
    expect(after.byCategory.vat).toBe(1);

    await service.markAllRead(user);
    expect((await service.unreadCount(user)).total).toBe(0);
  });

  it('filters the list by category and refuses another user row', async () => {
    const { service } = setup();
    const page = await service.listOwn(user, { category: 'vat', page: 1, pageSize: 20 });
    expect(page.total).toBe(1);
    expect(page.items.map((item) => item.category)).toEqual(['vat']);

    await expect(service.markRead(user, 'n5')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.markRead(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
