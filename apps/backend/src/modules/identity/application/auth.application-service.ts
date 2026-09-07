import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthPort } from '../domain/auth.port';
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
