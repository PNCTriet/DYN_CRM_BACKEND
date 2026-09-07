import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';

export class PaymentScheduleLineInputDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 5500000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class CreatePaymentScheduleDto {
  @ApiProperty({ type: [PaymentScheduleLineInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleLineInputDto)
  lines!: PaymentScheduleLineInputDto[];
}

export class PaymentScheduleLineResponseDto {
  id!: string;
  dueDate!: Date | null;
  amount!: string;
  sortOrder!: number;

  static from(record: {
    id: string;
    dueDate: Date | null;
    amount: Decimal;
    sortOrder: number;
  }): PaymentScheduleLineResponseDto {
    const dto = new PaymentScheduleLineResponseDto();
    dto.id = record.id;
    dto.dueDate = record.dueDate;
    dto.amount = record.amount.toString();
    dto.sortOrder = record.sortOrder;
    return dto;
  }
}

export class PaymentScheduleResponseDto {
  id!: string;
  orderId!: string;
  lines!: PaymentScheduleLineResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    orderId: string;
    createdAt: Date;
    updatedAt: Date;
    lines: {
      id: string;
      dueDate: Date | null;
      amount: Decimal;
      sortOrder: number;
    }[];
  }): PaymentScheduleResponseDto {
    const dto = new PaymentScheduleResponseDto();
    dto.id = record.id;
    dto.orderId = record.orderId;
    dto.lines = record.lines.map((l) => PaymentScheduleLineResponseDto.from(l));
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
