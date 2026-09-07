import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ExpenseCreateInput) {
    return this.prisma.expense.create({ data });
  }

  findById(id: string) {
    return this.prisma.expense.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    orderId?: string;
  }) {
    const where: Prisma.ExpenseWhereInput = {
      ...(params.orderId ? { orderId: params.orderId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ExpenseUpdateInput) {
    return this.prisma.expense.update({ where: { id }, data });
  }
}
