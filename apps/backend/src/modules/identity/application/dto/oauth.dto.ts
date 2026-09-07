import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthStartQueryDto {
  @ApiPropertyOptional({
    description:
      'FE callback URL after Google login (must start with OAUTH_REDIRECT_ALLOW_PREFIX)',
    example: 'http://localhost:3001/auth/callback',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  redirectTo?: string;
}

export class OAuthCallbackQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error_description?: string;
}
