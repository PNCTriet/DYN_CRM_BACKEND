import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../domain/auth-user';
import { AuthApplicationService } from '../application/auth.application-service';
import { SignUpDto } from '../application/dto/sign-up.dto';
import { LoginDto } from '../application/dto/login.dto';
import { RefreshTokenDto } from '../application/dto/refresh-token.dto';
import { ForgotPasswordDto } from '../application/dto/forgot-password.dto';
import { ChangePasswordDto } from '../application/dto/change-password.dto';
import {
  OAuthCallbackQueryDto,
  OAuthStartQueryDto,
} from '../application/dto/oauth.dto';
import {
  OAUTH_PKCE_COOKIE,
  buildClearCookie,
  buildSetCookie,
  decodeOAuthPkceCookie,
  encodeOAuthPkceCookie,
  parseCookieHeader,
} from './oauth-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthApplicationService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register via Supabase Auth + provision local user' })
  signup(@Body() dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password (Supabase)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('oauth/google')
  @ApiOperation({
    summary: 'Start Google OAuth (302 → Google/Supabase)',
    description:
      'Browser redirect. Set redirectTo to FE callback (allow-listed). PKCE verifier stored in httpOnly cookie.',
  })
  async startGoogleOAuth(
    @Query() query: OAuthStartQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const nestCallbackUrl = this.buildNestCallbackUrl(req);
    const { authorizeUrl, pkceStorage, feRedirect } =
      await this.auth.startGoogleOAuth(query.redirectTo, nestCallbackUrl);

    const cookieVal = encodeOAuthPkceCookie({ feRedirect, pkceStorage });
    res.setHeader(
      'Set-Cookie',
      buildSetCookie(OAUTH_PKCE_COOKIE, cookieVal, {
        maxAgeSec: 600,
        path: '/api/v1/auth',
        secure: process.env.NODE_ENV === 'production',
      }),
    );
    return res.redirect(302, authorizeUrl);
  }

  @Get('oauth/callback')
  @ApiOperation({
    summary: 'OAuth callback (Supabase → Nest → FE hash tokens)',
  })
  async oauthCallback(
    @Query() query: OAuthCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const payload = decodeOAuthPkceCookie(cookies[OAUTH_PKCE_COOKIE]);
    res.setHeader(
      'Set-Cookie',
      buildClearCookie(OAUTH_PKCE_COOKIE, '/api/v1/auth'),
    );

    if (query.error) {
      const msg = query.error_description || query.error;
      const target = this.auth.buildOAuthErrorRedirect(
        payload?.feRedirect,
        msg,
      );
      return res.redirect(302, target);
    }

    if (!query.code) {
      const target = this.auth.buildOAuthErrorRedirect(
        payload?.feRedirect,
        'Missing OAuth code',
      );
      return res.redirect(302, target);
    }

    if (!payload) {
      const target = this.auth.buildOAuthErrorRedirect(
        undefined,
        'Missing OAuth PKCE cookie — restart Google login',
      );
      return res.redirect(302, target);
    }

    try {
      const { redirectUrl } = await this.auth.completeGoogleOAuth(
        query.code,
        payload.pkceStorage,
        payload.feRedirect,
      );
      return res.redirect(302, redirectUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'OAuth completion failed';
      const target = this.auth.buildOAuthErrorRedirect(
        payload.feRedirect,
        message,
      );
      return res.redirect(302, target);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email (Supabase)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Invalidate session (Supabase global sign-out)' })
  logout(@Headers('authorization') authorization?: string) {
    const token = this.extractBearer(authorization);
    return this.auth.logout(token);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change password for current session' })
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ChangePasswordDto,
  ) {
    const token = this.extractBearer(authorization);
    return this.auth.changePassword(token, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Current authenticated user (permissions + roles)' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  private buildNestCallbackUrl(req: Request): string {
    const configured = process.env.API_PUBLIC_URL?.replace(/\/$/, '');
    if (configured) {
      return `${configured}/api/v1/auth/oauth/callback`;
    }
    const host = req.get('host') ?? 'localhost:3000';
    const protoHeader = req.get('x-forwarded-proto');
    const proto =
      protoHeader?.split(',')[0]?.trim() ||
      (req.protocol === 'https' ? 'https' : 'http');
    return `${proto}://${host}/api/v1/auth/oauth/callback`;
  }

  private extractBearer(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return authorization.slice('Bearer '.length).trim();
  }
}
