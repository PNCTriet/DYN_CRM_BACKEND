import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({ example: 'ORD-2026-001' })
  @IsString()
  @MaxLength(100)
  orderNumber!: string;

  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: 10000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiProperty({ example: 10000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalNet!: number;

  @ApiProperty({ example: 11000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalGross!: number;

  @ApiProperty()
  @IsUUID()
  assignedUserId!: string;

  @ApiPropertyOptional({
    description: 'Defaults to current user',
  })
  @IsOptional()
  @IsUUID()
  submitterUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'new', default: 'new' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  stage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
