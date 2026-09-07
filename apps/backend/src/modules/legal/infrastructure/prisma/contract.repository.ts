import { Injectable } from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContractCreateInput) {
    return this.prisma.contract.create({ data });
  }

  findById(id: string) {
    return this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { select: { ownerId: true } } },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    customerOwnerId?: string;
    search?: string;
    status?: ContractStatus;
    customerId?: string;
  }) {
    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(params.customerOwnerId
        ? { customer: { ownerId: params.customerOwnerId } }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.search
        ? {
            OR: [
              {
                contractNumber: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              { title: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { ownerId: true } } },
      }),
      this.prisma.contract.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ContractUpdateInput) {
    return this.prisma.contract.update({
      where: { id },
      data,
      include: { customer: { select: { ownerId: true } } },
    });
  }

  softDelete(id: string, updatedByUserId: string) {
    return this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date(), updatedByUserId },
    });
  }

  findCustomerOwnerId(customerId: string) {
    return this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true, ownerId: true },
    });
  }
}
