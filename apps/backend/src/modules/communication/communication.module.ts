import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationApplicationService } from './application/notification.application-service';
import { ReminderApplicationService } from './application/reminder.application-service';
import { NotificationRepository } from './infrastructure/prisma/notification.repository';
import { ReminderRepository } from './infrastructure/prisma/reminder.repository';
import { NotificationsController } from './presentation/notifications.controller';
import { RemindersController } from './presentation/reminders.controller';

@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController, RemindersController],
  providers: [
    NotificationApplicationService,
    ReminderApplicationService,
    NotificationRepository,
    ReminderRepository,
  ],
  exports: [NotificationApplicationService, ReminderApplicationService],
})
export class CommunicationModule {}
