import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

/** Batch name lookups so list endpoints avoid FE N+1 GETs. */
@Injectable()
export class EntityNameLookup {
  constructor(private readonly prisma: PrismaService) {}

  async usersById(ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) return new Map<string, string>();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((r) => [r.id, r.displayName]));
  }

  async customersById(ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) return new Map<string, string>();
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true, displayName: true, legalName: true },
    });
    return new Map(
      rows.map((r) => [r.id, r.displayName || r.legalName || r.id]),
    );
  }

  async servicesById(ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) return new Map<string, string>();
    const rows = await this.prisma.service.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async collaboratorsById(ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) return new Map<string, string>();
    const rows = await this.prisma.collaborator.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((r) => [r.id, r.displayName]));
  }

  async ordersById(ids: Array<string | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) {
      return new Map<string, { orderNumber: string; customerId: string }>();
    }
    const rows = await this.prisma.order.findMany({
      where: { id: { in: unique } },
      select: { id: true, orderNumber: true, customerId: true },
    });
    return new Map(
      rows.map((r) => [
        r.id,
        { orderNumber: r.orderNumber, customerId: r.customerId },
      ]),
    );
  }
}
