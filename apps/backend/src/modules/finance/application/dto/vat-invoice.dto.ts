import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateVatInvoiceDto {
  @ApiProperty({ example: 'VAT-2026-001' })
  @IsString()
  @MaxLength(100)
  invoiceNumber!: string;

  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiProperty({ example: 'ORDER' })
  @IsString()
  @MaxLength(50)
  sourceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerTaxCode?: string;

  @ApiProperty({ example: 10000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netAmount!: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiProperty({ example: 1000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount!: number;

  @ApiProperty({ example: 11000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossAmount!: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  lines?: Record<string, unknown> | unknown[];
}

export class ListVatInvoicesQueryDto {
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

export class IssueVatInvoiceDto {
  @ApiPropertyOptional({ example: '2026-09-06' })
  @IsOptional()
  @IsDateString()
  issueDate?: string;
}

export class VatInvoiceResponseDto {
  id!: string;
  invoiceNumber!: string;
  orderId!: string;
  paymentId!: string | null;
  sourceType!: string;
  customerName!: string | null;
  customerTaxCode!: string | null;
  netAmount!: string;
  vatRate!: string;
  vatAmount!: string;
  grossAmount!: string;
  status!: InvoiceStatus;
  issueDate!: Date | null;
  lines!: unknown;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: {
    id: string;
    invoiceNumber: string;
    orderId: string;
    paymentId: string | null;
    sourceType: string;
    customerName: string | null;
    customerTaxCode: string | null;
    netAmount: Decimal;
    vatRate: Decimal;
    vatAmount: Decimal;
    grossAmount: Decimal;
    status: InvoiceStatus;
    issueDate: Date | null;
    lines: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): VatInvoiceResponseDto {
    const dto = new VatInvoiceResponseDto();
    dto.id = record.id;
    dto.invoiceNumber = record.invoiceNumber;
    dto.orderId = record.orderId;
    dto.paymentId = record.paymentId;
    dto.sourceType = record.sourceType;
    dto.customerName = record.customerName;
    dto.customerTaxCode = record.customerTaxCode;
    dto.netAmount = record.netAmount.toString();
    dto.vatRate = record.vatRate.toString();
    dto.vatAmount = record.vatAmount.toString();
    dto.grossAmount = record.grossAmount.toString();
    dto.status = record.status;
    dto.issueDate = record.issueDate;
    dto.lines = record.lines;
    dto.createdAt = record.createdAt;
    dto.updatedAt = record.updatedAt;
    return dto;
  }
}
