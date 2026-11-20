import { UserStatus } from '@prisma/client';
import { NotificationPublisher } from '../../communication/application/notification.publisher';
import { PrismaService } from '../../../prisma/prisma.service';
import { IdentityAccessService } from './identity-access.service';
import { IdentityAdminService } from './identity-admin.service';

describe('IdentityAdminService directory', () => {
  it('returns at most 50 active users and searches display name or email', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'u1', displayName: 'Lan', email: 'lan@dyn.local', phone: '090', status: 'ACTIVE' },
    ]);
    const prisma = { user: { findMany } };
    const service = new IdentityAdminService(
      prisma as unknown as PrismaService,
      {} as IdentityAccessService,
      { notify: jest.fn() } as unknown as NotificationPublisher,
    );

    const rows = await service.directory({ q: '  Lan  ' });

    expect(rows).toEqual([{ id: 'u1', displayName: 'Lan', email: 'lan@dyn.local' }]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        OR: [
          { displayName: { contains: 'Lan', mode: 'insensitive' } },
          { email: { contains: 'Lan', mode: 'insensitive' } },
        ],
      },
      take: 50,
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, email: true },
    });
  });
});
