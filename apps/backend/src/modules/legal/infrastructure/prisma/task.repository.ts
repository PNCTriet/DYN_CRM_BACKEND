import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TaskCreateInput) {
    return this.prisma.task.create({ data });
  }

  findById(id: string) {
    return this.prisma.task.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    ownUserId?: string;
    contractId?: string;
    status?: string;
    assigneeUserId?: string;
  }) {
    const where: Prisma.TaskWhereInput = {
      ...(params.contractId ? { contractId: params.contractId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.assigneeUserId
        ? { assigneeUserId: params.assigneeUserId }
        : {}),
      ...(params.ownUserId
        ? {
            OR: [
              { assigneeUserId: params.ownUserId },
              { createdByUserId: params.ownUserId },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.TaskUpdateInput) {
    return this.prisma.task.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }

  findContract(id: string) {
    return this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
  }
}
