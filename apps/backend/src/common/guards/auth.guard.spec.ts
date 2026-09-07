import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { IdentityAccessService } from '../../modules/identity/application/identity-access.service';
import { AuthUser } from '../../modules/identity/domain/auth-user';

describe('AuthGuard', () => {
  const identity = {
    resolveFromToken: jest.fn(),
  } as unknown as IdentityAccessService;
  const guard = new AuthGuard(identity);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeContext(auth?: string) {
    const req: { headers: { authorization?: string }; user?: AuthUser } = {
      headers: { authorization: auth },
    };
    return {
      req,
      ctx: {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as never,
    };
  }

  it('accepts valid user token', async () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'ACTIVE',
      permissions: [],
      roleCodes: [],
    };
    (identity.resolveFromToken as jest.Mock).mockResolvedValue(user);
    const { ctx, req } = makeContext('Bearer test:u1');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(user);
  });

  it('rejects missing token', async () => {
    const { ctx } = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid token', async () => {
    (identity.resolveFromToken as jest.Mock).mockResolvedValue(null);
    const { ctx } = makeContext('Bearer bad');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects suspended/deactivated (null from identity)', async () => {
    (identity.resolveFromToken as jest.Mock).mockResolvedValue(null);
    const { ctx } = makeContext('Bearer test:suspended');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
