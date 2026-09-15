import { Injectable } from '@nestjs/common';
import { PaymentVerificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  WidgetoCustomersStats,
  WidgetoOrdersStats,
  WidgetoPaymentsStats,
  WidgetoRangeQueryDto,
  WidgetoSummary,
} from './dto/widgeto.dto';

@Injectable()
export class WidgetoApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: WidgetoRangeQueryDto): Promise<WidgetoSummary> {
    const [customers, orders, payments] = await Promise.all([
      this.customers(query),
      this.orders(query),
      this.payments(query),
    ]);
    return {
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
  }

  async customers(query: WidgetoRangeQueryDto): Promise<WidgetoCustomersStats> {
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

  async orders(query: WidgetoRangeQueryDto): Promise<WidgetoOrdersStats> {
    const createdAt = this.dateRange(query);
    const groups = await this.prisma.order.groupBy({
      by: ['stage'],
      where: createdAt ? { createdAt } : undefined,
      _count: { _all: true },
    });
    const { total, byKey } = mapGroupedCounts(groups, 'stage');
    return { total, byStage: byKey };
  }

  async payments(query: WidgetoRangeQueryDto): Promise<WidgetoPaymentsStats> {
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
      verifiedAmount: (verifiedAgg._sum.amount ?? new Prisma.Decimal(0)).toString(),
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
