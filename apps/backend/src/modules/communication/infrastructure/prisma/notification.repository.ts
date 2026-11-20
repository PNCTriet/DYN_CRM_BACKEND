import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: {
    skip: number;
    take: number;
    recipientUserId: string;
    category?: string;
  }) {
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: params.recipientUserId,
      ...(params.category ? { category: params.category } : {}),
    };
    return Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.notification.findFirst({ where: { id } });
  }

  markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  markAllRead(recipientUserId: string, category?: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientUserId,
        readAt: null,
        ...(category ? { category } : {}),
      },
      data: { readAt: new Date() },
    });
  }

  /** One grouped query for the sidebar badge. Uses (recipient_user_id, read_at). */
  countUnreadByCategory(recipientUserId: string) {
    return this.prisma.notification.groupBy({
      by: ['category'],
      where: { recipientUserId, readAt: null },
      _count: { _all: true },
    });
  }

  findByDedupe(recipientUserId: string, dedupeKey: string) {
    return this.prisma.notification.findFirst({
      where: { recipientUserId, dedupeKey },
    });
  }

  create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }
}
