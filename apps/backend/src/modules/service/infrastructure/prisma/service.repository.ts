import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ServiceCreateInput) {
    return this.prisma.service.create({ data });
  }

  findById(id: string) {
    return this.prisma.service.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    createdByUserId?: string;
    search?: string;
    status?: string;
    category?: string;
  }) {
    const where: Prisma.ServiceWhereInput = {
      ...(params.createdByUserId
        ? { createdByUserId: params.createdByUserId }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { code: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ServiceUpdateInput) {
    return this.prisma.service.update({ where: { id }, data });
  }
}
