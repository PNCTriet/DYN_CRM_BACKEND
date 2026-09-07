import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ReminderCreateInput) {
    return this.prisma.reminder.create({ data });
  }

  findById(id: string) {
    return this.prisma.reminder.findFirst({ where: { id } });
  }

  findMany(params: {
    skip: number;
    take: number;
    recipientUserId: string;
    status?: string;
  }) {
    const where: Prisma.ReminderWhereInput = {
      recipientUserId: params.recipientUserId,
      ...(params.status ? { status: params.status } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.reminder.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { remindAt: 'asc' },
      }),
      this.prisma.reminder.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ReminderUpdateInput) {
    return this.prisma.reminder.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.reminder.delete({ where: { id } });
  }
}
