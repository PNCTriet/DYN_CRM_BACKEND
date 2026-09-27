import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationApplicationService } from './application/notification.application-service';
import { ReminderApplicationService } from './application/reminder.application-service';
import { EmailTemplateApplicationService } from './application/email-template.application-service';
import { NotificationPreferenceApplicationService } from './application/notification-preference.application-service';
import { MailApplicationService } from './application/mail.application-service';
import { NotificationRepository } from './infrastructure/prisma/notification.repository';
import { ReminderRepository } from './infrastructure/prisma/reminder.repository';
import { EmailTemplateRepository } from './infrastructure/prisma/email-template.repository';
import { NotificationPreferenceRepository } from './infrastructure/prisma/notification-preference.repository';
import { OutboundEmailLogRepository } from './infrastructure/prisma/outbound-email-log.repository';
import { NotificationsController } from './presentation/notifications.controller';
import { RemindersController } from './presentation/reminders.controller';
import { EmailTemplatesController } from './presentation/email-templates.controller';
import { NotificationPreferencesController } from './presentation/notification-preferences.controller';
import { MailController } from './presentation/mail.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    NotificationsController,
    RemindersController,
    EmailTemplatesController,
    NotificationPreferencesController,
    MailController,
  ],
  providers: [
    NotificationApplicationService,
    ReminderApplicationService,
    EmailTemplateApplicationService,
    NotificationPreferenceApplicationService,
    MailApplicationService,
    NotificationRepository,
    ReminderRepository,
    EmailTemplateRepository,
    NotificationPreferenceRepository,
    OutboundEmailLogRepository,
  ],
  exports: [
    NotificationApplicationService,
    ReminderApplicationService,
    MailApplicationService,
    NotificationPreferenceApplicationService,
  ],
})
export class CommunicationModule {}
