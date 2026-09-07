import { AuthApplicationService } from './auth.application-service';
import { AuthPort } from '../domain/auth.port';
import { IdentityAccessService } from './identity-access.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('AuthApplicationService', () => {
  const authPort = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    refresh: jest.fn(),
    getSubject: jest.fn(),
    requestPasswordReset: jest.fn(),
    updatePassword: jest.fn(),
    getOAuthAuthorizeUrl: jest.fn(),
    exchangeOAuthCode: jest.fn(),
  } as unknown as AuthPort;

  const identityAccess = {
    ensureLocalUser: jest.fn(),
    loadAuthUserBySubject: jest.fn(),
  } as unknown as IdentityAccessService;

  const configMap: Record<string, string> = {
    DEFAULT_SIGNUP_ROLE: 'SALES',
    OAUTH_REDIRECT_ALLOW_PREFIX: 'http://localhost:3001',
    OAUTH_SUCCESS_REDIRECT_URL: 'http://localhost:3001/auth/callback',
  };

  const config = {
    get: jest.fn((key: string) => configMap[key]),
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

  describe('Google OAuth', () => {
    it('startGoogleOAuth rejects redirectTo outside allow-list', async () => {
      await expect(
        service.startGoogleOAuth(
          'https://evil.example/phish',
          'http://localhost:3000/api/v1/auth/oauth/callback',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authPort.getOAuthAuthorizeUrl).not.toHaveBeenCalled();
    });

    it('startGoogleOAuth returns authorize URL for allowed redirect', async () => {
      (authPort.getOAuthAuthorizeUrl as jest.Mock).mockResolvedValue({
        url: 'https://accounts.google.com/o/oauth2',
        pkceStorage: { v: '1' },
      });
      const res = await service.startGoogleOAuth(
        'http://localhost:3001/auth/callback',
        'http://localhost:3000/api/v1/auth/oauth/callback',
      );
      expect(res.authorizeUrl).toContain('google');
      expect(res.pkceStorage).toEqual({ v: '1' });
      expect(res.feRedirect).toBe('http://localhost:3001/auth/callback');
      expect(authPort.getOAuthAuthorizeUrl).toHaveBeenCalledWith({
        provider: 'google',
        redirectTo: 'http://localhost:3000/api/v1/auth/oauth/callback',
      });
    });

    it('completeGoogleOAuth provisions new user and builds hash redirect', async () => {
      (authPort.exchangeOAuthCode as jest.Mock).mockResolvedValue({
        subject: {
          subjectId: 'sub-g',
          email: 'g@gmail.com',
          displayName: 'G User',
        },
        tokens: sampleTokens,
      });
      (identityAccess.loadAuthUserBySubject as jest.Mock).mockResolvedValue(
        null,
      );
      (identityAccess.ensureLocalUser as jest.Mock).mockResolvedValue({
        ...sampleUser,
        email: 'g@gmail.com',
        displayName: 'G User',
      });

      const res = await service.completeGoogleOAuth(
        'auth-code',
        { pkce: 'x' },
        'http://localhost:3001/auth/callback',
      );

      expect(identityAccess.ensureLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({
          authSubjectId: 'sub-g',
          email: 'g@gmail.com',
          displayName: 'G User',
          defaultRoleCode: 'SALES',
        }),
      );
      expect(res.session.accessToken).toBe('at');
      expect(res.redirectUrl).toContain('http://localhost:3001/auth/callback#');
      expect(res.redirectUrl).toContain('access_token=at');
      expect(res.redirectUrl).toContain('refresh_token=rt');
    });

    it('completeGoogleOAuth skips provision when user exists', async () => {
      (authPort.exchangeOAuthCode as jest.Mock).mockResolvedValue({
        subject: { subjectId: 'sub-g', email: 'g@gmail.com' },
        tokens: sampleTokens,
      });
      (identityAccess.loadAuthUserBySubject as jest.Mock).mockResolvedValue(
        sampleUser,
      );

      await service.completeGoogleOAuth(
        'auth-code',
        {},
        'http://localhost:3001/auth/callback',
      );
      expect(identityAccess.ensureLocalUser).not.toHaveBeenCalled();
    });

    it('completeGoogleOAuth rejects disallowed feRedirect', async () => {
      await expect(
        service.completeGoogleOAuth('c', {}, 'https://evil.example/x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
