import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class WidgetoRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive lower bound (ISO). Customers/orders: createdAt; payments: recordedAt',
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
