import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../domain/auth-user';
import { AuthApplicationService } from '../application/auth.application-service';
import { SignUpDto } from '../application/dto/sign-up.dto';
import { LoginDto } from '../application/dto/login.dto';
import { RefreshTokenDto } from '../application/dto/refresh-token.dto';
import { ForgotPasswordDto } from '../application/dto/forgot-password.dto';
import { ChangePasswordDto } from '../application/dto/change-password.dto';

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

  private extractBearer(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return authorization.slice('Bearer '.length).trim();
  }
}
