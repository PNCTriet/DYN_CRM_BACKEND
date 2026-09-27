import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.userNotificationPreference.findMany({
      where: { userId },
      orderBy: [{ channel: 'asc' }, { eventType: 'asc' }],
    });
  }

  findOne(userId: string, channel: string, eventType: string) {
    return this.prisma.userNotificationPreference.findFirst({
      where: { userId, channel, eventType },
    });
  }

  upsert(data: {
    userId: string;
    channel: string;
    eventType: string;
    enabled: boolean;
    channelAddress?: string | null;
  }) {
    return this.prisma.userNotificationPreference.upsert({
      where: {
        userId_channel_eventType: {
          userId: data.userId,
          channel: data.channel,
          eventType: data.eventType,
        },
      },
      create: {
        userId: data.userId,
        channel: data.channel,
        eventType: data.eventType,
        enabled: data.enabled,
        channelAddress: data.channelAddress ?? null,
      },
      update: {
        enabled: data.enabled,
        ...(data.channelAddress !== undefined
          ? { channelAddress: data.channelAddress }
          : {}),
      },
    });
  }
}
