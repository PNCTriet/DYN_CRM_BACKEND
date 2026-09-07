import { IdentityAccessService } from './identity-access.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthPort } from '../domain/auth.port';
import { ConfigService } from '@nestjs/config';

describe('IdentityAccessService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), create: jest.fn() },
    role: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const authPort = {
    getSubject: jest.fn(),
  } as unknown as AuthPort;

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AUTH_MODE') return 'test';
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new IdentityAccessService(prisma, authPort, config);

  beforeEach(() => jest.clearAllMocks());

  it('loads active user permissions via RBAC chain', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'ACTIVE',
      userRoles: [
        {
          role: {
            code: 'SALES',
            rolePermissionGroups: [
              {
                permissionGroup: {
                  groupPermissions: [
                    { permission: { code: 'customer.view' } },
                    { permission: { code: 'customer.update' } },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
    const user = await service.loadAuthUser('u1');
    expect(user?.permissions).toEqual(
      expect.arrayContaining(['customer.view', 'customer.update']),
    );
    expect(user?.roleCodes).toEqual(['SALES']);
  });

  it('rejects SUSPENDED user', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'SUSPENDED',
      userRoles: [],
    });
    await expect(service.loadAuthUser('u1')).resolves.toBeNull();
  });

  it('rejects DEACTIVATED user', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'DEACTIVATED',
      userRoles: [],
    });
    await expect(service.loadAuthUser('u1')).resolves.toBeNull();
  });

  it('resolves test: token', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: null,
      displayName: 'A',
      status: 'ACTIVE',
      userRoles: [],
    });
    const user = await service.resolveFromToken('test:u1');
    expect(user?.email).toBe('');
    expect(user?.id).toBe('u1');
  });

  it('resolves Supabase JWT via AuthPort subject', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue({
      subjectId: 'sub-1',
      email: 'x@y.z',
    });
    (prisma.user.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 'u9', authSubjectId: 'sub-1', deletedAt: null })
      .mockResolvedValueOnce({
        id: 'u9',
        email: 'x@y.z',
        displayName: 'X',
        status: 'ACTIVE',
        userRoles: [],
      });
    const user = await service.resolveFromToken('jwt-token');
    expect(user?.id).toBe('u9');
  });
});
