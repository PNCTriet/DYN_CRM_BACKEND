import { Module } from '@nestjs/common';
import { NotificationPublisher } from './application/notification.publisher';
import { NotificationRepository } from './infrastructure/prisma/notification.repository';

/** Inbox writer shared by communication, identity, and finance. No module cycle. */
@Module({
  providers: [NotificationRepository, NotificationPublisher],
  exports: [NotificationRepository, NotificationPublisher],
})
export class NotificationCoreModule {}
