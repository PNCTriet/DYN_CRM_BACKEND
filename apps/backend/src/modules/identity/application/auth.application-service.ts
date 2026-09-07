import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthPort, AuthTokens } from '../domain/auth.port';
import { AuthUser } from '../domain/auth-user';
import { IdentityAccessService } from './identity-access.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  tokenType: string;
  user: AuthUser;
  requiresEmailConfirmation?: false;
}

export interface SignUpPendingResponse {
  requiresEmailConfirmation: true;
  message: string;
  user: AuthUser;
}

export interface GoogleOAuthStartResult {
  authorizeUrl: string;
  pkceStorage: Record<string, string>;
  feRedirect: string;
}

export interface GoogleOAuthCompleteResult {
  redirectUrl: string;
  session: SessionResponse;
}

@Injectable()
export class AuthApplicationService {
  constructor(
    private readonly authPort: AuthPort,
    private readonly identityAccess: IdentityAccessService,
    private readonly config: ConfigService,
  ) {}

  async signUp(
    dto: SignUpDto,
  ): Promise<SessionResponse | SignUpPendingResponse> {
    const { subject, tokens } = await this.authPort.signUp({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });
    const user = await this.identityAccess.ensureLocalUser({
      authSubjectId: subject.subjectId,
      email: subject.email ?? dto.email,
      displayName: dto.displayName,
      defaultRoleCode: this.config.get<string>('DEFAULT_SIGNUP_ROLE') ?? 'SALES',
    });

    if (!tokens) {
      return {
        requiresEmailConfirmation: true,
        message:
          'Account created. Confirm email (Supabase), then POST /auth/login. For local API testing: Supabase → Authentication → Providers → Email → turn OFF "Confirm email", then signup again with a new email.',
        user,
      };
    }
    return this.toSession(tokens, user);
  }

  async login(dto: LoginDto): Promise<SessionResponse> {
    const { subject, tokens } = await this.authPort.signIn({
      email: dto.email,
      password: dto.password,
    });
    let user = await this.identityAccess.loadAuthUserBySubject(subject.subjectId);
    if (!user) {
      user = await this.identityAccess.ensureLocalUser({
        authSubjectId: subject.subjectId,
        email: subject.email ?? dto.email,
        displayName: subject.email?.split('@')[0] ?? 'User',
        defaultRoleCode: this.config.get<string>('DEFAULT_SIGNUP_ROLE') ?? 'SALES',
      });
    }
    return this.toSession(tokens, user);
  }

  async logout(accessToken: string): Promise<{ success: true }> {
    await this.authPort.signOut(accessToken);
    return { success: true };
  }

  async refresh(dto: RefreshTokenDto): Promise<SessionResponse> {
    const tokens = await this.authPort.refresh(dto.refreshToken);
    const subject = await this.authPort.getSubject(tokens.accessToken);
    if (!subject) {
      throw new UnauthorizedException('Invalid session after refresh');
    }
    const user = await this.identityAccess.loadAuthUserBySubject(subject.subjectId);
    if (!user) {
      throw new UnauthorizedException('User inactive or not provisioned');
    }
    return this.toSession(tokens, user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: true }> {
    const redirectTo =
      dto.redirectTo ?? this.config.get<string>('PASSWORD_RESET_REDIRECT_URL');
    await this.authPort.requestPasswordReset(dto.email, redirectTo);
    return { success: true };
  }

  async changePassword(
    accessToken: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    await this.authPort.updatePassword(accessToken, dto.newPassword);
    return { success: true };
  }

  me(user: AuthUser): AuthUser {
    return user;
  }

  /**
   * Start Google OAuth (Supabase). Controller redirects browser to authorizeUrl
   * and stores pkceStorage + feRedirect in httpOnly cookie.
   */
  async startGoogleOAuth(
    redirectToFe: string | undefined,
    nestCallbackUrl: string,
  ): Promise<GoogleOAuthStartResult> {
    const feRedirect = this.resolveFeRedirect(redirectToFe);
    this.assertRedirectAllowed(feRedirect);
    const { url, pkceStorage } = await this.authPort.getOAuthAuthorizeUrl({
      provider: 'google',
      redirectTo: nestCallbackUrl,
    });
    return { authorizeUrl: url, pkceStorage, feRedirect };
  }

  /**
   * Exchange OAuth code → provision local user → FE redirect with token hash.
   */
  async completeGoogleOAuth(
    code: string,
    pkceStorage: Record<string, string>,
    feRedirect: string,
  ): Promise<GoogleOAuthCompleteResult> {
    this.assertRedirectAllowed(feRedirect);
    const { subject, tokens } = await this.authPort.exchangeOAuthCode({
      code,
      pkceStorage,
    });
    let user = await this.identityAccess.loadAuthUserBySubject(
      subject.subjectId,
    );
    if (!user) {
      const email = subject.email;
      if (!email) {
        throw new BadRequestException(
          'Google account has no email; cannot provision user',
        );
      }
      user = await this.identityAccess.ensureLocalUser({
        authSubjectId: subject.subjectId,
        email,
        displayName:
          subject.displayName ?? email.split('@')[0] ?? 'User',
        defaultRoleCode:
          this.config.get<string>('DEFAULT_SIGNUP_ROLE') ?? 'SALES',
      });
    }
    const session = this.toSession(tokens, user);
    return {
      session,
      redirectUrl: this.buildOAuthSuccessRedirect(feRedirect, tokens),
    };
  }

  buildOAuthErrorRedirect(
    feRedirect: string | undefined,
    message: string,
  ): string {
    const base =
      feRedirect && this.isRedirectAllowed(feRedirect)
        ? feRedirect
        : this.resolveFeRedirect(undefined);
    const url = new URL(base);
    url.hash = new URLSearchParams({
      error: 'oauth_failed',
      error_description: message.slice(0, 200),
    }).toString();
    return url.toString();
  }

  private resolveFeRedirect(redirectToFe: string | undefined): string {
    const fallback =
      this.config.get<string>('OAUTH_SUCCESS_REDIRECT_URL') ??
      'http://localhost:3001/auth/callback';
    return redirectToFe?.trim() || fallback;
  }

  private assertRedirectAllowed(url: string): void {
    if (!this.isRedirectAllowed(url)) {
      throw new BadRequestException(
        `redirectTo not allowed. Must start with OAUTH_REDIRECT_ALLOW_PREFIX (${this.allowPrefixes().join(', ')})`,
      );
    }
  }

  private isRedirectAllowed(url: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      return false;
    }
    return this.allowPrefixes().some((prefix) => url.startsWith(prefix));
  }

  private allowPrefixes(): string[] {
    const raw =
      this.config.get<string>('OAUTH_REDIRECT_ALLOW_PREFIX') ??
      'http://localhost:3001';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private buildOAuthSuccessRedirect(
    feRedirect: string,
    tokens: AuthTokens,
  ): string {
    const url = new URL(feRedirect);
    const params = new URLSearchParams({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: String(tokens.expiresIn),
      token_type: tokens.tokenType || 'bearer',
    });
    if (tokens.expiresAt != null) {
      params.set('expires_at', String(tokens.expiresAt));
    }
    url.hash = params.toString();
    return url.toString();
  }

  private toSession(
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt?: number;
      tokenType: string;
    },
    user: AuthUser,
  ): SessionResponse {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      expiresAt: tokens.expiresAt,
      tokenType: tokens.tokenType,
      user,
    };
  }
}
