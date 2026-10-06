import { IdentityAccessService } from './identity-access.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthPort } from '../domain/auth.port';
import { ConfigService } from '@nestjs/config';

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'a@b.c',
    displayName: 'A',
    status: 'ACTIVE',
    authSubjectId: 'sub-1',
    roleCodes: ['SALES'],
    permissionCodes: ['customer.view', 'customer.update'],
    ...overrides,
  };
}

describe('IdentityAccessService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), create: jest.fn() },
    role: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  const authPort = {
    getSubject: jest.fn(),
  } as unknown as AuthPort;

  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const service = new IdentityAccessService(prisma, authPort, config);

  beforeEach(() => {
    jest.clearAllMocks();
    service.invalidateAll();
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'AUTH_MODE') return 'test';
      return undefined;
    });
  });

  it('loads active user permissions in one query', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([activeRow()]);
    const user = await service.loadAuthUser('u1');
    expect(user?.permissions).toEqual(['customer.update', 'customer.view']);
    expect(user?.roleCodes).toEqual(['SALES']);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects SUSPENDED user', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      activeRow({ status: 'SUSPENDED' }),
    ]);
    await expect(service.loadAuthUser('u1')).resolves.toBeNull();
  });

  it('rejects DEACTIVATED user', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      activeRow({ status: 'DEACTIVATED' }),
    ]);
    await expect(service.loadAuthUser('u1')).resolves.toBeNull();
  });

  it('does not cache blocked users', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      activeRow({ status: 'SUSPENDED' }),
    ]);
    await service.loadAuthUser('u1');
    await service.loadAuthUser('u1');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('reuses a cached active user until invalidated or the TTL passes', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([activeRow()]);
      const first = await service.loadAuthUser('u1');
      first?.permissions.push('order.delete');
      const second = await service.loadAuthUser('u1');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(second?.permissions).toEqual(['customer.update', 'customer.view']);

      service.invalidateUser('u1');
      await service.loadAuthUser('u1');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);

      now.mockReturnValue(1_000_000 + 44_000);
      await service.loadAuthUser('u1');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);

      now.mockReturnValue(1_000_000 + 46_000);
      await service.loadAuthUser('u1');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    } finally {
      now.mockRestore();
    }
  });

  it('resolves test: token only when test tokens are allowed', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      activeRow({ email: null, roleCodes: [], permissionCodes: [] }),
    ]);
    const user = await service.resolveFromToken('test:u1');
    expect(user?.email).toBe('');
    expect(user?.id).toBe('u1');
    expect(authPort.getSubject).not.toHaveBeenCalled();
  });

  it('does not honor test tokens when AUTH_MODE=supabase', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue(null);
    await expect(service.resolveFromToken('test:u1')).resolves.toBeNull();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(authPort.getSubject).toHaveBeenCalledWith('test:u1');
  });

  it('resolves a Supabase subject with one permission query', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue({
      subjectId: 'sub-1',
      email: 'x@y.z',
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      activeRow({ id: 'u9', email: 'x@y.z', displayName: 'X' }),
    ]);
    const user = await service.resolveFromToken('jwt-token');
    expect(user?.id).toBe('u9');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('returns null for a rejected token without querying permissions', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue(null);
    await expect(service.resolveFromToken('expired')).resolves.toBeNull();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('uses non-empty JWT permission claims and still checks user status', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue({
      subjectId: 'sub-1',
      email: 'x@y.z',
      permissionCodes: ['order.view'],
      roleCodes: ['SALES'],
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u9',
      email: 'x@y.z',
      displayName: 'X',
      status: 'ACTIVE',
      authSubjectId: 'sub-1',
    });
    const user = await service.resolveFromToken('jwt-with-claims');
    expect(user?.permissions).toEqual(['order.view']);
    expect(user?.roleCodes).toEqual(['SALES']);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();

    service.invalidateUser('u9');
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'u9',
      email: 'x@y.z',
      displayName: 'X',
      status: 'SUSPENDED',
      authSubjectId: 'sub-1',
    });
    await expect(service.resolveFromToken('jwt-with-claims')).resolves.toBeNull();
  });

  it('ignores empty hook claims and loads permissions from the database', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === 'AUTH_MODE' ? 'supabase' : undefined,
    );
    (authPort.getSubject as jest.Mock).mockResolvedValue({
      subjectId: 'sub-1',
      email: 'x@y.z',
      permissionCodes: [],
      roleCodes: [],
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([activeRow({ id: 'u9' })]);
    const user = await service.resolveFromToken('jwt-empty-claims');
    expect(user?.id).toBe('u9');
    expect(user?.permissions).toEqual(['customer.update', 'customer.view']);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
