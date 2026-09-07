import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentVerificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scheduleLineId?: string;
}

export class ListPaymentsQueryDto {
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

export class PaymentResponseDto {
  id!: string;
  orderId!: string;
  scheduleLineId!: string | null;
  amount!: string;
  method!: PaymentMethod;
  recordedAt!: Date;
  verificationStatus!: PaymentVerificationStatus;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    orderId: string;
    scheduleLineId: string | null;
    amount: Decimal;
    method: PaymentMethod;
    recordedAt: Date;
    verificationStatus: PaymentVerificationStatus;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = record.id;
    dto.orderId = record.orderId;
    dto.scheduleLineId = record.scheduleLineId;
    dto.amount = record.amount.toString();
    dto.method = record.method;
    dto.recordedAt = record.recordedAt;
    dto.verificationStatus = record.verificationStatus;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
