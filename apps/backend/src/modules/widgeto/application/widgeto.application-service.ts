import { Injectable } from '@nestjs/common';
import { PaymentVerificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WidgetoCustomersStats,
  WidgetoOrdersStats,
  WidgetoPaymentsStats,
  WidgetoRangeQueryDto,
  WidgetoSummary,
  WidgetoW12Row,
} from './dto/widgeto.dto';

@Injectable()
export class WidgetoApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoSummary | WidgetoW12Row[]> {
    const [customers, orders, payments] = await Promise.all([
      this.customersStats(query),
      this.ordersStats(query),
      this.paymentsStats(query),
    ]);
    const data: WidgetoSummary = {
      generatedAt: new Date().toISOString(),
      customers,
      orders,
      payments: {
        totalCount: payments.totalCount,
        verifiedCount: payments.verifiedCount,
        verifiedAmount: payments.verifiedAmount,
        byStatus: payments.byStatus,
      },
    };
    if (query.format === 'w12') {
      return summaryToW12(data);
    }
    return data;
  }

  async customers(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoCustomersStats | WidgetoW12Row[]> {
    const data = await this.customersStats(query);
    if (query.format === 'w12') {
      return customersToW12(data);
    }
    return data;
  }

  async orders(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoOrdersStats | WidgetoW12Row[]> {
    const data = await this.ordersStats(query);
    if (query.format === 'w12') {
      return ordersToW12(data);
    }
    return data;
  }

  async payments(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoPaymentsStats | WidgetoW12Row[]> {
    const data = await this.paymentsStats(query);
    if (query.format === 'w12') {
      return paymentsToW12(data);
    }
    return data;
  }

  private async customersStats(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoCustomersStats> {
    const createdAt = this.dateRange(query);
    const groups = await this.prisma.customer.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { _all: true },
    });
    const { total, byKey } = mapGroupedCounts(groups, 'status');
    return { total, byStatus: byKey };
  }

  private async ordersStats(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoOrdersStats> {
    const createdAt = this.dateRange(query);
    const groups = await this.prisma.order.groupBy({
      by: ['stage'],
      where: createdAt ? { createdAt } : undefined,
      _count: { _all: true },
    });
    const { total, byKey } = mapGroupedCounts(groups, 'stage');
    return { total, byStage: byKey };
  }

  private async paymentsStats(
    query: WidgetoRangeQueryDto,
  ): Promise<WidgetoPaymentsStats> {
    const recordedAt = this.dateRange(query);
    const whereBase: Prisma.PaymentWhereInput = recordedAt
      ? { recordedAt }
      : {};

    const [groups, verifiedAgg] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['verificationStatus'],
        where: whereBase,
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...whereBase,
          verificationStatus: PaymentVerificationStatus.VERIFIED,
        },
        _sum: { amount: true },
      }),
    ]);

    const byStatus: Record<'RECORDED' | 'VERIFIED' | 'VOIDED', number> = {
      RECORDED: 0,
      VERIFIED: 0,
      VOIDED: 0,
    };
    let totalCount = 0;
    for (const row of groups) {
      const key = row.verificationStatus;
      const n = row._count._all;
      byStatus[key] = n;
      totalCount += n;
    }

    return {
      totalCount,
      verifiedCount: byStatus.VERIFIED,
      verifiedAmount: (
        verifiedAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toString(),
      byStatus,
      currency: 'VND',
    };
  }

  private dateRange(
    query: WidgetoRangeQueryDto,
  ): Prisma.DateTimeFilter | undefined {
    if (!query.from && !query.to) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (query.from) range.gte = new Date(query.from);
    if (query.to) range.lte = new Date(query.to);
    return range;
  }
}

/** Pure helper — unit-tested without Prisma. */
export function mapGroupedCounts<K extends string>(
  groups: Array<{ [P in K]: string } & { _count: { _all: number } }>,
  key: K,
): { total: number; byKey: Record<string, number> } {
  const byKey: Record<string, number> = {};
  let total = 0;
  for (const row of groups) {
    const label = row[key] || 'unknown';
    byKey[label] = row._count._all;
    total += row._count._all;
  }
  return { total, byKey };
}

export function summaryToW12(data: WidgetoSummary): WidgetoW12Row[] {
  const rows: WidgetoW12Row[] = [
    { key: 'DYN CRM', color: 'main' },
    { key: 'Customers', value: String(data.customers.total), color: 'info' },
    { key: 'Orders', value: String(data.orders.total), color: 'info' },
    {
      key: 'Pay verified',
      value: String(data.payments.verifiedCount),
      color: 'success',
    },
    {
      key: 'Amount VND',
      value: truncate(data.payments.verifiedAmount, 24),
      color: 'success',
    },
  ];
  return rows.slice(0, 12);
}

export function customersToW12(data: WidgetoCustomersStats): WidgetoW12Row[] {
  const rows: WidgetoW12Row[] = [
    { key: 'CUSTOMERS', color: 'main' },
    { key: 'Total', value: String(data.total), color: 'info' },
    { key: '' },
  ];
  for (const [status, count] of Object.entries(data.byStatus)) {
    if (rows.length >= 12) break;
    rows.push({
      key: truncate(status, 24),
      value: String(count),
    });
  }
  return rows.slice(0, 12);
}

export function ordersToW12(data: WidgetoOrdersStats): WidgetoW12Row[] {
  const rows: WidgetoW12Row[] = [
    { key: 'ORDERS', color: 'main' },
    { key: 'Total', value: String(data.total), color: 'info' },
    { key: '' },
  ];
  for (const [stage, count] of Object.entries(data.byStage)) {
    if (rows.length >= 12) break;
    rows.push({
      key: truncate(stage, 24),
      value: String(count),
    });
  }
  return rows.slice(0, 12);
}

export function paymentsToW12(data: WidgetoPaymentsStats): WidgetoW12Row[] {
  const rows: WidgetoW12Row[] = [
    { key: 'PAYMENTS', color: 'main' },
    { key: 'Total', value: String(data.totalCount) },
    {
      key: 'Verified',
      value: String(data.verifiedCount),
      color: 'success',
    },
    {
      key: 'Amount',
      value: truncate(data.verifiedAmount, 24),
      color: 'success',
    },
    { key: '' },
    { key: 'Recorded', value: String(data.byStatus.RECORDED), color: 'muted' },
    { key: 'Voided', value: String(data.byStatus.VOIDED), color: 'warning' },
  ];
  return rows.slice(0, 12);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}
