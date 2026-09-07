import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class VatInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.VatInvoiceCreateInput) {
    return this.prisma.vatInvoice.create({ data });
  }

  findById(id: string) {
    return this.prisma.vatInvoice.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    orderId?: string;
  }) {
    const where: Prisma.VatInvoiceWhereInput = {
      ...(params.orderId ? { orderId: params.orderId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.vatInvoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vatInvoice.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.VatInvoiceUpdateInput) {
    return this.prisma.vatInvoice.update({ where: { id }, data });
  }
}
