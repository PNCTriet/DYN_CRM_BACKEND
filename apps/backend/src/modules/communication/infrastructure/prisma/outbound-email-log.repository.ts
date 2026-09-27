import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class OutboundEmailLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OutboundEmailLogCreateInput) {
    return this.prisma.outboundEmailLog.create({ data });
  }

  findMany(params: { skip: number; take: number; templateKey?: string }) {
    const where: Prisma.OutboundEmailLogWhereInput = {};
    if (params.templateKey) where.templateKey = params.templateKey;
    return this.prisma.$transaction([
      this.prisma.outboundEmailLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.outboundEmailLog.count({ where }),
    ]);
  }
}
