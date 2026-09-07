import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CommissionCreateInput) {
    return this.prisma.commission.create({ data });
  }

  findById(id: string) {
    return this.prisma.commission.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    orderId?: string;
  }) {
    const where: Prisma.CommissionWhereInput = {
      ...(params.orderId ? { orderId: params.orderId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.commission.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commission.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CommissionUpdateInput) {
    return this.prisma.commission.update({ where: { id }, data });
  }

  findPayment(id: string) {
    return this.prisma.payment.findFirst({ where: { id } });
  }
}
