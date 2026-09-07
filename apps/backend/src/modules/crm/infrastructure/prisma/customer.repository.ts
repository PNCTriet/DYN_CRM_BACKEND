import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data });
  }

  findById(id: string) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    ownerId?: string;
    search?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      ...(params.search
        ? {
            OR: [
              { legalName: { contains: params.search, mode: 'insensitive' } },
              { displayName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
              { taxId: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  softDelete(id: string, updatedByUserId: string) {
    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByUserId,
      },
    });
  }
}
