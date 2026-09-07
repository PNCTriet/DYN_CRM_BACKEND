import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const CUSTOMER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

export class CreateCustomerDto {
  @ApiProperty({ enum: CUSTOMER_TYPES })
  @IsIn(CUSTOMER_TYPES)
  type!: (typeof CUSTOMER_TYPES)[number];

  @ApiProperty({ example: 'Công ty TNHH ABC' })
  @IsString()
  @MaxLength(500)
  legalName!: string;

  @ApiProperty({ example: 'ABC' })
  @IsString()
  @MaxLength(500)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  industryOrField?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Requires customer.assign; default = current user',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
