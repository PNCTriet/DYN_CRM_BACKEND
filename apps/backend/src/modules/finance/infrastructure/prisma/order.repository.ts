import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

/** Linked contract has other orders whose customer would disagree with this change. */
export class ContractCustomerConflictError extends Error {
  constructor() {
    super(
      'Cannot change customer because the linked contract has other orders for a different customer',
    );
    this.name = 'ContractCustomerConflictError';
  }
}

export type OrderCustomerSync = {
  contractId: string;
  customerId: string;
  updatedByUserId: string;
};

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data });
  }

  private readonly withNames = {
    service: { select: { id: true, name: true } },
    collaborator: { select: { id: true, displayName: true } },
  } as const;

  findById(id: string) {
    return this.prisma.order.findFirst({
      where: { id },
      include: this.withNames,
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    assignedUserId?: string;
    search?: string;
    stage?: string;
    customerId?: string;
    contractId?: string;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(params.assignedUserId
        ? { assignedUserId: params.assignedUserId }
        : {}),
      ...(params.stage ? { stage: params.stage } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.contractId ? { contractId: params.contractId } : {}),
      ...(params.search
        ? {
            OR: [
              {
                orderNumber: { contains: params.search, mode: 'insensitive' },
              },
              { notes: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: this.withNames,
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  /**
   * When `sync` is set, the order write and `contracts.customerId` commit
   * together. Sibling orders on that contract that still point at another
   * customer abort the transaction.
   */
  async update(
    id: string,
    data: Prisma.OrderUpdateInput,
    sync?: OrderCustomerSync,
  ) {
    if (!sync) {
      return this.prisma.order.update({ where: { id }, data });
    }
    return this.prisma.$transaction(async (tx) => {
      const others = await tx.order.count({
        where: {
          contractId: sync.contractId,
          id: { not: id },
          customerId: { not: sync.customerId },
        },
      });
      if (others > 0) {
        throw new ContractCustomerConflictError();
      }
      await tx.contract.update({
        where: { id: sync.contractId },
        data: {
          customer: { connect: { id: sync.customerId } },
          updatedByUserId: sync.updatedByUserId,
        },
      });
      return tx.order.update({ where: { id }, data });
    });
  }

  findContract(id: string) {
    return this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
  }

  findCustomer(id: string) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, ownerId: true },
    });
  }

  findService(id: string) {
    return this.prisma.service.findFirst({
      where: { id },
      select: { id: true, createdByUserId: true },
    });
  }

  findActiveUser(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
  }

  getPaymentSchedule(orderId: string) {
    return this.prisma.paymentSchedule.findUnique({
      where: { orderId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  upsertPaymentSchedule(
    orderId: string,
    userId: string,
    lines: {
      dueDate?: Date;
      amount: Prisma.Decimal;
      sortOrder: number;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentSchedule.findUnique({
        where: { orderId },
      });
      if (existing) {
        await tx.paymentScheduleLine.deleteMany({
          where: { scheduleId: existing.id },
        });
        return tx.paymentSchedule.update({
          where: { id: existing.id },
          data: {
            updatedByUserId: userId,
            lines: {
              create: lines.map((l) => ({
                dueDate: l.dueDate,
                amount: l.amount,
                sortOrder: l.sortOrder,
              })),
            },
          },
          include: { lines: { orderBy: { sortOrder: 'asc' } } },
        });
      }
      return tx.paymentSchedule.create({
        data: {
          order: { connect: { id: orderId } },
          createdByUserId: userId,
          updatedByUserId: userId,
          lines: {
            create: lines.map((l) => ({
              dueDate: l.dueDate,
              amount: l.amount,
              sortOrder: l.sortOrder,
            })),
          },
        },
        include: { lines: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }
}
