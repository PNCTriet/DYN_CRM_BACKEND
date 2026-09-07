import { AuthApplicationService } from './auth.application-service';
import { AuthPort } from '../domain/auth.port';
import { IdentityAccessService } from './identity-access.service';
import { ConfigService } from '@nestjs/config';

describe('AuthApplicationService', () => {
  const authPort = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    refresh: jest.fn(),
    getSubject: jest.fn(),
    requestPasswordReset: jest.fn(),
    updatePassword: jest.fn(),
  } as unknown as AuthPort;

  const identityAccess = {
    ensureLocalUser: jest.fn(),
    loadAuthUserBySubject: jest.fn(),
  } as unknown as IdentityAccessService;

  const config = {
    get: jest.fn().mockReturnValue('SALES'),
  } as unknown as ConfigService;

  const service = new AuthApplicationService(authPort, identityAccess, config);

  const sampleUser = {
    id: 'u1',
    email: 'a@b.c',
    displayName: 'A',
    status: 'ACTIVE',
    permissions: ['customer.view'],
    roleCodes: ['SALES'],
  };

  const sampleTokens = {
    accessToken: 'at',
    refreshToken: 'rt',
    expiresIn: 3600,
    tokenType: 'bearer',
  };

  beforeEach(() => jest.clearAllMocks());

  it('signup provisions local user and returns session', async () => {
    (authPort.signUp as jest.Mock).mockResolvedValue({
      subject: { subjectId: 'sub', email: 'a@b.c' },
      tokens: sampleTokens,
    });
    (identityAccess.ensureLocalUser as jest.Mock).mockResolvedValue(sampleUser);
    const res = await service.signUp({
      email: 'a@b.c',
      password: 'Password1!',
      displayName: 'A',
    });
    expect(res).toMatchObject({ accessToken: 'at', user: { id: 'u1' } });
  });

  it('signup without session returns email confirmation pending', async () => {
    (authPort.signUp as jest.Mock).mockResolvedValue({
      subject: { subjectId: 'sub', email: 'a@b.c' },
      tokens: null,
    });
    (identityAccess.ensureLocalUser as jest.Mock).mockResolvedValue(sampleUser);
    const res = await service.signUp({
      email: 'a@b.c',
      password: 'Password1!',
      displayName: 'A',
    });
    expect(res).toMatchObject({
      requiresEmailConfirmation: true,
      user: { id: 'u1' },
    });
  });

  it('login returns session for existing subject', async () => {
    (authPort.signIn as jest.Mock).mockResolvedValue({
      subject: { subjectId: 'sub', email: 'a@b.c' },
      tokens: sampleTokens,
    });
    (identityAccess.loadAuthUserBySubject as jest.Mock).mockResolvedValue(
      sampleUser,
    );
    const res = await service.login({ email: 'a@b.c', password: 'Password1!' });
    expect(res.refreshToken).toBe('rt');
    expect(identityAccess.ensureLocalUser).not.toHaveBeenCalled();
  });

  it('logout calls AuthPort.signOut', async () => {
    await service.logout('at');
    expect(authPort.signOut).toHaveBeenCalledWith('at');
  });
});
