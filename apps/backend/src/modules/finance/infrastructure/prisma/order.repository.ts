import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data });
  }

  findById(id: string) {
    return this.prisma.order.findFirst({ where: { id } });
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
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({ where: { id }, data });
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
      select: { id: true },
    });
  }

  findService(id: string) {
    return this.prisma.service.findFirst({
      where: { id },
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
