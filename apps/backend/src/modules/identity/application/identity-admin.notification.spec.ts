import { UserStatus } from '@prisma/client';
import { NotificationPublisher } from '../../communication/application/notification.publisher';
import { PrismaService } from '../../../prisma/prisma.service';
import { IdentityAccessService } from './identity-access.service';
import { IdentityAdminService } from './identity-admin.service';

describe('IdentityAdminService user_approved', () => {
  const notifications = {
    notify: jest.fn().mockResolvedValue({ inserted: 1, existing: 0 }),
  };

  const userRow = {
    id: 'user-1',
    authSubjectId: 'sub',
    email: 'new@gmail.com',
    displayName: 'New User',
    phone: null,
    status: UserStatus.PENDING_APPROVAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [],
  };

  function serviceWith(status: UserStatus) {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ ...userRow, status }),
        update: jest.fn().mockResolvedValue({
          ...userRow,
          status: UserStatus.ACTIVE,
        }),
      },
    };
    const identityAccess = {
      invalidateUser: jest.fn(),
    };
    const service = new IdentityAdminService(
      prisma as unknown as PrismaService,
      identityAccess as unknown as IdentityAccessService,
      notifications as unknown as NotificationPublisher,
    );
    return { service, prisma };
  }

  beforeEach(() => {
    notifications.notify.mockClear();
  });

  it('notifies the approved user only when leaving PENDING_APPROVAL', async () => {
    const pending = serviceWith(UserStatus.PENDING_APPROVAL);
    await pending.service.updateUser('user-1', { status: 'ACTIVE' });
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user_approved',
        recipientUserIds: ['user-1'],
        href: '/dashboard',
        dedupeKey: 'user_approved:user-1',
        sourceType: 'user',
        sourceId: 'user-1',
      }),
    );

    notifications.notify.mockClear();
    const already = serviceWith(UserStatus.ACTIVE);
    await already.service.updateUser('user-1', { status: 'ACTIVE' });
    expect(notifications.notify).not.toHaveBeenCalled();

    const renamed = serviceWith(UserStatus.PENDING_APPROVAL);
    await renamed.service.updateUser('user-1', { displayName: 'Still waiting' });
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
