import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  findById(id: string) {
    return this.prisma.payment.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    orderId?: string;
  }) {
    const where: Prisma.PaymentWhereInput = {
      ...(params.orderId ? { orderId: params.orderId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.PaymentUpdateInput) {
    return this.prisma.payment.update({ where: { id }, data });
  }

  findScheduleLine(id: string) {
    return this.prisma.paymentScheduleLine.findFirst({ where: { id } });
  }
}
