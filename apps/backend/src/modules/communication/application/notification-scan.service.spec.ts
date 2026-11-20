import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationPublisher } from './notification.publisher';
import { NotificationRepository } from '../infrastructure/prisma/notification.repository';
import { NotificationScanService } from './notification-scan.service';

type Stored = {
  id: string;
  recipientUserId: string;
  dedupeKey: string;
  type: string;
  category: string;
};

function memoryRepo() {
  const rows: Stored[] = [];
  const repo = {
    rows,
    findByDedupe: jest.fn(async (recipientUserId: string, dedupeKey: string) => {
      return (
        rows.find(
          (row) =>
            row.recipientUserId === recipientUserId && row.dedupeKey === dedupeKey,
        ) ?? null
      );
    }),
    create: jest.fn(async (data: Stored) => {
      const duplicate = rows.some(
        (row) =>
          row.recipientUserId === data.recipientUserId &&
          row.dedupeKey === data.dedupeKey,
      );
      if (duplicate) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      const row = { ...data, id: `n${rows.length + 1}` };
      rows.push(row);
      return row;
    }),
  };
  return repo;
}

describe('NotificationScanService dedupe', () => {
  const now = new Date('2026-11-19T17:30:00.000Z');
  const orderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const assignee = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  function setup() {
    const repo = memoryRepo();
    const publisher = new NotificationPublisher(
      repo as unknown as NotificationRepository,
      {} as PrismaService,
    );
    const prisma = {
      appConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: orderId,
            orderNumber: 'DH-001',
            customerId: 'cust',
            assignedUserId: assignee,
            stage: 'processing',
            deadline: new Date('2026-11-19T00:00:00.000Z'),
            needsVat: true,
            vatIssueDeadline: new Date('2026-11-19T00:00:00.000Z'),
            service: {
              name: 'Thành lập DN',
              customFields: { licenseExpiryWarnMonths: 2 },
            },
            documents: [
              { fileType: 'license|2024-01-01|2026-12-01' },
              { fileType: 'contract' },
            ],
            vatInvoices: [],
          },
        ]),
      },
      paymentScheduleLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            dueDate: new Date('2026-11-18T00:00:00.000Z'),
            amount: { toString: () => '500000' },
            payments: [
              {
                amount: { toString: () => '100000' },
                verificationStatus: 'VOIDED',
              },
            ],
            schedule: {
              order: {
                id: orderId,
                orderNumber: 'DH-001',
                customerId: 'cust',
                assignedUserId: assignee,
                stage: 'processing',
                service: { name: 'Thành lập DN' },
              },
            },
          },
        ]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: assignee }]) },
      customer: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cust', displayName: 'Công ty A' },
        ]),
      },
    };
    const service = new NotificationScanService(
      prisma as unknown as PrismaService,
      publisher,
    );
    return { service, repo, prisma };
  }

  it('inserts each due row once and skips them on a second run the same civil day', async () => {
    const { service, repo } = setup();
    const first = await service.run(now);
    expect(first.civilDate).toBe('2026-11-20');
    expect(first.timeZone).toBe('Asia/Ho_Chi_Minh');
    expect(first.candidates).toBe(4);
    expect(first.inserted).toBe(4);
    expect(first.existing).toBe(0);
    expect(repo.rows.map((row) => row.dedupeKey).sort()).toEqual([
      `license_expiring:${orderId}:2026-11-20`,
      `order_overdue:${orderId}:2026-11-20`,
      'payment_overdue:cccccccc-cccc-cccc-cccc-cccccccccccc:2026-11-20',
      `vat_overdue:${orderId}:2026-11-20`,
    ]);
    expect(repo.rows.map((row) => row.category).sort()).toEqual([
      'licenses',
      'orders',
      'payments',
      'vat',
    ]);

    const second = await service.run(now);
    expect(second.candidates).toBe(4);
    expect(second.inserted).toBe(0);
    expect(second.existing).toBe(4);
    expect(repo.rows).toHaveLength(4);
  });

  it('does not insert when the unique index races', async () => {
    const repo = memoryRepo();
    repo.findByDedupe.mockResolvedValue(null);
    const publisher = new NotificationPublisher(
      repo as unknown as NotificationRepository,
      {} as PrismaService,
    );
    const first = await publisher.notify({
      recipientUserIds: [assignee],
      type: 'order_overdue',
      title: 'Đơn DH-001 quá hạn xử lý',
      dedupeKey: `order_overdue:${orderId}:2026-11-20`,
    });
    expect(first).toEqual({ inserted: 1, existing: 0 });

    repo.findByDedupe.mockResolvedValueOnce(null);
    const second = await publisher.notify({
      recipientUserIds: [assignee],
      type: 'order_overdue',
      title: 'Đơn DH-001 quá hạn xử lý',
      dedupeKey: `order_overdue:${orderId}:2026-11-20`,
    });
    expect(second).toEqual({ inserted: 0, existing: 1 });
    expect(repo.rows).toHaveLength(1);
  });
});
