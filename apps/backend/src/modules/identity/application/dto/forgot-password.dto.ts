import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sales@dyn.local' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Next.js reset page URL (allow-listed in Supabase Auth redirect URLs)',
  })
  @IsOptional()
  @IsString()
  redirectTo?: string;
}
