import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const CUSTOMER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

/** Explicit command: POST /leads/:id/convert */
export class ConvertLeadDto {
  @ApiProperty({ enum: CUSTOMER_TYPES })
  @IsIn(CUSTOMER_TYPES)
  type!: (typeof CUSTOMER_TYPES)[number];

  @ApiPropertyOptional({ description: 'Defaults to lead.name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Defaults to legalName / lead.name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  industryOrField?: string;
}
