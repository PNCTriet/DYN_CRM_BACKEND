import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class WidgetoRangeQueryDto {
  @ApiPropertyOptional({
    description:
      'Inclusive lower bound (ISO). Customers/orders: createdAt; payments: recordedAt',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound (ISO)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description:
      'Shared secret alternative to X-Widgeto-Key header (Widgeto URL / QR)',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'json (default) | w12 (API Widget / Widgeto W12 key-value rows)',
    enum: ['json', 'w12'],
    default: 'json',
  })
  @IsOptional()
  @IsIn(['json', 'w12'])
  format?: 'json' | 'w12';
}

/** W12 template row — https://apiwidget.com/docs/w12 */
export interface WidgetoW12Row {
  key: string;
  value?: string;
  color?: 'main' | 'muted' | 'info' | 'success' | 'warning' | 'danger';
}

export interface WidgetoCustomersStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface WidgetoOrdersStats {
  total: number;
  byStage: Record<string, number>;
}

export interface WidgetoPaymentsStats {
  totalCount: number;
  verifiedCount: number;
  verifiedAmount: string;
  byStatus: Record<'RECORDED' | 'VERIFIED' | 'VOIDED', number>;
  currency: 'VND';
}

export interface WidgetoSummary {
  generatedAt: string;
  customers: WidgetoCustomersStats;
  orders: WidgetoOrdersStats;
  payments: {
    totalCount: number;
    verifiedCount: number;
    verifiedAmount: string;
    byStatus: Record<'RECORDED' | 'VERIFIED' | 'VOIDED', number>;
  };
}
