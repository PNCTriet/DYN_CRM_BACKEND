import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const CUSTOMER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES)
  type?: (typeof CUSTOMER_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  displayName?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Key from crm.customerStatusCatalog config',
    example: 'lead',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
