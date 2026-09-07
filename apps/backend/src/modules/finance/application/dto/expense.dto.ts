import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateExpenseDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 'Công chứng' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  payeeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  incurredOn?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  ctvRelated?: boolean;
}

export class ListExpensesQueryDto {
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

export class ReviewExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ExpenseResponseDto {
  id!: string;
  orderId!: string;
  title!: string;
  amount!: string;
  currency!: string;
  note!: string | null;
  payeeName!: string | null;
  description!: string | null;
  incurredOn!: Date | null;
  ctvRelated!: boolean;
  status!: ExpenseStatus;
  requestedByUserId!: string;
  requestedAt!: Date;
  reviewedByUserId!: string | null;
  reviewedAt!: Date | null;
  reviewNote!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    orderId: string;
    title: string;
    amount: Decimal;
    currency: string;
    note: string | null;
    payeeName: string | null;
    description: string | null;
    incurredOn: Date | null;
    ctvRelated: boolean;
    status: ExpenseStatus;
    requestedByUserId: string;
    requestedAt: Date;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ExpenseResponseDto {
    const dto = new ExpenseResponseDto();
    dto.id = record.id;
    dto.orderId = record.orderId;
    dto.title = record.title;
    dto.amount = record.amount.toString();
    dto.currency = record.currency;
    dto.note = record.note;
    dto.payeeName = record.payeeName;
    dto.description = record.description;
    dto.incurredOn = record.incurredOn;
    dto.ctvRelated = record.ctvRelated;
    dto.status = record.status;
    dto.requestedByUserId = record.requestedByUserId;
    dto.requestedAt = record.requestedAt;
    dto.reviewedByUserId = record.reviewedByUserId;
    dto.reviewedAt = record.reviewedAt;
    dto.reviewNote = record.reviewNote;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
