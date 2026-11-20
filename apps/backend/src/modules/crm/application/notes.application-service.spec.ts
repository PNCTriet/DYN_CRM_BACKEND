import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationPublisher } from '../../communication/application/notification.publisher';
import { OrderPolicy } from '../../finance/domain/policies/order.policy';
import { AuthUser } from '../../identity/domain/auth-user';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotesApplicationService } from './notes.application-service';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const AUTHOR_ID = '22222222-2222-4222-8222-222222222222';
const ASSIGNEE_ID = '33333333-3333-4333-8333-333333333333';
const MANAGER_ID = '44444444-4444-4444-8444-444444444444';
const NO_VIEW_ID = '55555555-5555-4555-8555-555555555555';
const OUTSIDER_ID = '66666666-6666-4666-8666-666666666666';
const INACTIVE_ID = '77777777-7777-4777-8777-777777777777';

type MentionRow = {
  id: string;
  displayName: string;
  status: string;
  deletedAt: Date | null;
  userRoles: Array<{
    role: {
      rolePermissionGroups: Array<{
        permissionGroup: {
          groupPermissions: Array<{ permission: { code: string } }>;
        };
      }>;
    };
  }>;
};

function mention(id: string, displayName: string, permissions: string[], status = 'ACTIVE'): MentionRow {
  return {
    id,
    displayName,
    status,
    deletedAt: null,
    userRoles: [
      {
        role: {
          rolePermissionGroups: [
            {
              permissionGroup: {
                groupPermissions: permissions.map((code) => ({ permission: { code } })),
              },
            },
          ],
        },
      },
    ],
  };
}

function auth(partial: Partial<AuthUser> & Pick<AuthUser, 'id' | 'permissions'>): AuthUser {
  return {
    email: `${partial.id}@dyn.local`,
    displayName: partial.displayName ?? 'User',
    status: 'ACTIVE',
    roleCodes: ['SALES'],
    ...partial,
  };
}

describe('NotesApplicationService', () => {
  const order = {
    id: ORDER_ID,
    orderNumber: 'DH-1042',
    assignedUserId: ASSIGNEE_ID,
    submitterUserId: 'submitter',
  };
  const people = [
    mention(AUTHOR_ID, 'Minh', ['order.view', 'order.update', 'customer.view', 'customer.update']),
    mention(ASSIGNEE_ID, 'Lan', ['order.view']),
    mention(MANAGER_ID, 'Hà', ['order.view', 'order.assign']),
    mention(NO_VIEW_ID, 'Không xem', ['customer.view']),
    mention(OUTSIDER_ID, 'Khác', ['order.view']),
    mention(INACTIVE_ID, 'Nghỉ', ['order.view', 'order.assign'], 'SUSPENDED'),
  ];

  function setup() {
    const notes: Array<Record<string, unknown>> = [];
    const notify = jest.fn().mockResolvedValue({ inserted: 1, existing: 0 });
    let seq = 0;
    const prisma = {
      order: {
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) =>
          where.id === order.id ? order : null,
        ),
      },
      user: {
        findMany: jest.fn(async (args: { where: { id: { in: string[] } }; select?: { userRoles?: unknown } }) => {
          const ids = new Set(args.where.id.in);
          const rows = people.filter((person) => ids.has(person.id));
          if (args.select?.userRoles) return rows;
          return rows.map((person) => ({ id: person.id, displayName: person.displayName }));
        }),
      },
      note: {
        create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
          seq += 1;
          const created = {
            id: `note-${seq}`,
            subjectType: data.subjectType,
            subjectId: data.subjectId,
            content: data.content,
            createdByUserId: data.createdByUserId,
            updatedByUserId: data.updatedByUserId,
            createdAt: new Date(`2026-11-20T0${seq}:00:00.000Z`),
            updatedAt: new Date(`2026-11-20T0${seq}:00:00.000Z`),
            mentions: (data.mentions?.create ?? []).map((row: { userId: string }) => ({
              userId: row.userId,
            })),
          };
          notes.push(created);
          return created;
        }),
        findMany: jest.fn(async (args: { where: { subjectType: string; subjectId: string }; orderBy?: { createdAt?: 'asc' | 'desc' } }) => {
          const rows = notes.filter(
            (note) =>
              note.subjectType === args.where.subjectType &&
              note.subjectId === args.where.subjectId,
          );
          if (args.orderBy?.createdAt === 'desc') {
            rows.sort(
              (a, b) =>
                (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime(),
            );
          }
          return rows.map((note) => ({
            ...note,
            mentions: ((note.mentions as { userId: string }[]) ?? []).map((mentionRow) => {
              const person = people.find((item) => item.id === mentionRow.userId);
              return {
                userId: mentionRow.userId,
                user: person
                  ? { id: person.id, displayName: person.displayName }
                  : null,
              };
            }),
          }));
        }),
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) =>
          notes.find((note) => note.id === where.id) ?? null,
        ),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: { content: string; updatedByUserId: string } }) => {
          const note = notes.find((item) => item.id === where.id);
          if (!note) throw new Error('missing note');
          note.content = data.content;
          note.updatedByUserId = data.updatedByUserId;
          note.updatedAt = new Date('2026-11-20T09:00:00.000Z');
          return {
            ...note,
            mentions: ((note.mentions as { userId: string }[]) ?? []).map((mentionRow) => {
              const person = people.find((item) => item.id === mentionRow.userId);
              return {
                userId: mentionRow.userId,
                user: person
                  ? { id: person.id, displayName: person.displayName }
                  : null,
              };
            }),
          };
        }),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
          const index = notes.findIndex((note) => note.id === where.id);
          if (index < 0) throw new Error('missing note');
          const [removed] = notes.splice(index, 1);
          return removed;
        }),
      },
    };
    const service = new NotesApplicationService(
      prisma as unknown as PrismaService,
      new OrderPolicy(),
      { notify } as unknown as NotificationPublisher,
    );
    return { service, notes, notify, prisma };
  }

  const author = auth({
    id: AUTHOR_ID,
    displayName: 'Minh',
    permissions: ['order.view', 'order.update', 'order.assign', 'customer.view', 'customer.update'],
  });

  it('notifies viewers only and dedupes mentioned users', async () => {
    const { service, notes, notify } = setup();

    const created = await service.create(author, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
      content: `  ${'ạ'.repeat(130)}  `,
      mentionedUserIds: [
        AUTHOR_ID,
        ASSIGNEE_ID,
        ASSIGNEE_ID,
        MANAGER_ID,
        NO_VIEW_ID,
        OUTSIDER_ID,
      ],
    });

    expect(created.authorUserId).toBe(AUTHOR_ID);
    expect(created.authorName).toBe('Minh');
    expect(created.subjectType).toBe('ORDER');
    expect(created.mentionedUserIds).toEqual([
      AUTHOR_ID,
      ASSIGNEE_ID,
      MANAGER_ID,
      NO_VIEW_ID,
      OUTSIDER_ID,
    ]);
    expect(created.mentionedUserNames).toEqual(['Minh', 'Lan', 'Hà', 'Không xem', 'Khác']);
    expect(notes).toHaveLength(1);
    expect((notes[0].mentions as { userId: string }[]).map((row) => row.userId)).toEqual([
      AUTHOR_ID,
      ASSIGNEE_ID,
      MANAGER_ID,
      NO_VIEW_ID,
      OUTSIDER_ID,
    ]);

    const calls = notify.mock.calls.map((call) => call[0]);
    expect(calls.map((call) => call.recipientUserIds)).toEqual([[ASSIGNEE_ID], [MANAGER_ID]]);
    expect(calls.map((call) => call.dedupeKey)).toEqual([
      `order_mentioned:note-1:${ASSIGNEE_ID}`,
      `order_mentioned:note-1:${MANAGER_ID}`,
    ]);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        type: 'order_mentioned',
        title: 'Minh nhắc bạn trong đơn DH-1042',
        href: `/orders/${ORDER_ID}?tab=notes`,
        sourceType: 'order',
        sourceId: ORDER_ID,
      }),
    );
    expect(calls[0].body.endsWith('…')).toBe(true);
    expect(Array.from(calls[0].body)).toHaveLength(120);
  });

  it('keeps the note when notification insert throws', async () => {
    const { service, notes, notify } = setup();
    notify.mockRejectedValue(new Error('inbox down'));
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const created = await service.create(author, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
      content: 'vẫn lưu',
      mentionedUserIds: [ASSIGNEE_ID],
    });

    expect(created.content).toBe('vẫn lưu');
    expect(notes).toHaveLength(1);
    expect(notify).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('rejects inactive or unknown mentions before inserting the note', async () => {
    const { service, notes, notify } = setup();
    await expect(
      service.create(author, {
        subjectType: 'ORDER',
        subjectId: ORDER_ID,
        content: 'nhắc',
        mentionedUserIds: [INACTIVE_ID, '88888888-8888-4888-8888-888888888888'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notes).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it('enforces OWN and ALL scope on list and create', async () => {
    const { service, prisma } = setup();
    const assignee = auth({
      id: ASSIGNEE_ID,
      displayName: 'Lan',
      permissions: ['order.view', 'order.update'],
    });
    const outsider = auth({
      id: OUTSIDER_ID,
      displayName: 'Khác',
      permissions: ['order.view', 'order.update'],
    });
    const manager = auth({
      id: MANAGER_ID,
      displayName: 'Hà',
      permissions: ['order.view', 'order.update', 'order.assign'],
    });

    const customerOnly = auth({
      id: ASSIGNEE_ID,
      displayName: 'Lan',
      permissions: ['customer.view', 'customer.update'],
    });
    await expect(
      service.list(customerOnly, { subjectType: 'ORDER', subjectId: ORDER_ID }),
    ).rejects.toThrow(new ForbiddenException('Missing permission: order.view'));
    await expect(
      service.create(customerOnly, {
        subjectType: 'ORDER',
        subjectId: ORDER_ID,
        content: 'no',
      }),
    ).rejects.toThrow(new ForbiddenException('Missing permission: order.update'));

    await expect(
      service.list(outsider, { subjectType: 'ORDER', subjectId: ORDER_ID }),
    ).rejects.toThrow(new ForbiddenException('Outside data scope'));
    await expect(
      service.create(outsider, {
        subjectType: 'ORDER',
        subjectId: ORDER_ID,
        content: 'no',
      }),
    ).rejects.toThrow(new ForbiddenException('Outside data scope'));

    const listed = await service.list(assignee, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
    });
    expect(listed).toEqual([]);
    await service.create(assignee, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
      content: 'của phụ trách',
    });
    await service.create(manager, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
      content: 'của quản lý',
    });

    await expect(
      service.list(assignee, {
        subjectType: 'ORDER',
        subjectId: '99999999-9999-4999-8999-999999999999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const newestFirst = await service.list(manager, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
    });
    expect(newestFirst.map((note) => note.content)).toEqual([
      'của quản lý',
      'của phụ trách',
    ]);
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('keeps CUSTOMER and LEAD on customer permissions and does not emit', async () => {
    const { service, notify, prisma } = setup();
    const sales = auth({
      id: AUTHOR_ID,
      displayName: 'Minh',
      permissions: ['customer.view', 'customer.update'],
    });
    const noCustomer = auth({
      id: OUTSIDER_ID,
      permissions: ['order.view', 'order.update'],
    });

    await expect(
      service.create(noCustomer, {
        subjectType: 'CUSTOMER',
        subjectId: ORDER_ID,
        content: 'x',
      }),
    ).rejects.toThrow(new ForbiddenException('Missing permission: customer.update'));
    await expect(
      service.list(noCustomer, { subjectType: 'LEAD', subjectId: ORDER_ID }),
    ).rejects.toThrow(new ForbiddenException('Missing permission: customer.view'));

    const customer = await service.create(sales, {
      subjectType: 'CUSTOMER',
      subjectId: ORDER_ID,
      content: 'ghi chú khách',
    });
    const lead = await service.create(sales, {
      subjectType: 'LEAD',
      subjectId: ORDER_ID,
      content: 'ghi chú lead',
    });
    expect(customer.mentionedUserIds).toEqual([]);
    expect(lead.subjectType).toBe('LEAD');
    expect(notify).not.toHaveBeenCalled();

    await expect(
      service.create(sales, {
        subjectType: 'LEAD',
        subjectId: ORDER_ID,
        content: 'x',
        mentionedUserIds: [ASSIGNEE_ID],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const customerNotes = await service.list(sales, {
      subjectType: 'CUSTOMER',
      subjectId: ORDER_ID,
    });
    expect(customerNotes.map((note) => note.content)).toEqual(['ghi chú khách']);

    const otherSales = auth({
      id: OUTSIDER_ID,
      permissions: ['customer.update'],
    });
    const edited = await service.update(otherSales, customer.id, { content: 'sửa' });
    expect(edited.content).toBe('sửa');
    expect(edited.authorUserId).toBe(AUTHOR_ID);
    expect(notify).not.toHaveBeenCalled();
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('lets the author or an in-scope order.update user change an ORDER note, never by id alone', async () => {
    const { service, notes, notify } = setup();
    const created = await service.create(author, {
      subjectType: 'ORDER',
      subjectId: ORDER_ID,
      content: 'gốc',
      mentionedUserIds: [ASSIGNEE_ID],
    });
    notify.mockClear();

    const authorOnly = auth({
      id: AUTHOR_ID,
      displayName: 'Minh',
      permissions: [],
    });
    const edited = await service.update(authorOnly, created.id, { content: 'tác giả sửa' });
    expect(edited.content).toBe('tác giả sửa');
    expect(edited.mentionedUserIds).toEqual([ASSIGNEE_ID]);
    expect(notify).not.toHaveBeenCalled();

    const outsider = auth({
      id: OUTSIDER_ID,
      permissions: ['order.update', 'customer.update'],
    });
    await expect(
      service.update(outsider, created.id, { content: 'không' }),
    ).rejects.toThrow(new ForbiddenException('Outside data scope'));
    await expect(service.remove(outsider, created.id)).rejects.toThrow(
      new ForbiddenException('Outside data scope'),
    );

    const customerOnly = auth({
      id: MANAGER_ID,
      permissions: ['customer.update'],
    });
    await expect(service.remove(customerOnly, created.id)).rejects.toThrow(
      new ForbiddenException('Missing permission: order.update'),
    );
    expect(notes).toHaveLength(1);

    const manager = auth({
      id: MANAGER_ID,
      permissions: ['order.update', 'order.assign'],
    });
    await service.remove(manager, created.id);
    expect(notes).toHaveLength(0);

    const customerNote = await service.create(
      auth({
        id: AUTHOR_ID,
        displayName: 'Minh',
        permissions: ['customer.update'],
      }),
      { subjectType: 'CUSTOMER', subjectId: ORDER_ID, content: 'khách' },
    );
    await expect(
      service.remove(
        auth({ id: AUTHOR_ID, permissions: ['order.update'] }),
        customerNote.id,
      ),
    ).rejects.toThrow(new ForbiddenException('Missing permission: customer.update'));
  });
});
