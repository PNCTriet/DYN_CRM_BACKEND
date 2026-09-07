import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateCommissionDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  beneficiaryUserId?: string;

  @ApiProperty({ example: 10, description: 'Rate percent' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate!: number;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount!: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  periodEnd!: string;
}

export class CalculateCommissionDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate!: number;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount!: number;
}

export class ListCommissionsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class CommissionResponseDto {
  id!: string;
  orderId!: string;
  paymentId!: string | null;
  collaboratorId!: string | null;
  beneficiaryUserId!: string | null;
  rate!: string;
  baseAmount!: string;
  commissionAmount!: string;
  periodStart!: Date;
  periodEnd!: Date;
  status!: CommissionStatus;
  calculatedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    orderId: string;
    paymentId: string | null;
    collaboratorId: string | null;
    beneficiaryUserId: string | null;
    rate: Decimal;
    baseAmount: Decimal;
    commissionAmount: Decimal;
    periodStart: Date;
    periodEnd: Date;
    status: CommissionStatus;
    calculatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CommissionResponseDto {
    const dto = new CommissionResponseDto();
    dto.id = record.id;
    dto.orderId = record.orderId;
    dto.paymentId = record.paymentId;
    dto.collaboratorId = record.collaboratorId;
    dto.beneficiaryUserId = record.beneficiaryUserId;
    dto.rate = record.rate.toString();
    dto.baseAmount = record.baseAmount.toString();
    dto.commissionAmount = record.commissionAmount.toString();
    dto.periodStart = record.periodStart;
    dto.periodEnd = record.periodEnd;
    dto.status = record.status;
    dto.calculatedAt = record.calculatedAt;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
