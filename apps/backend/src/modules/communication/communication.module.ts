import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationApplicationService } from './application/notification.application-service';
import { NotificationScanCron } from './application/notification-scan.cron';
import { NotificationScanService } from './application/notification-scan.service';
import { ReminderApplicationService } from './application/reminder.application-service';
import { EmailTemplateApplicationService } from './application/email-template.application-service';
import { NotificationPreferenceApplicationService } from './application/notification-preference.application-service';
import { MailApplicationService } from './application/mail.application-service';
import { ReminderRepository } from './infrastructure/prisma/reminder.repository';
import { NotificationCoreModule } from './notification-core.module';
import { EmailTemplateRepository } from './infrastructure/prisma/email-template.repository';
import { NotificationPreferenceRepository } from './infrastructure/prisma/notification-preference.repository';
import { OutboundEmailLogRepository } from './infrastructure/prisma/outbound-email-log.repository';
import { NotificationsController } from './presentation/notifications.controller';
import { RemindersController } from './presentation/reminders.controller';
import { EmailTemplatesController } from './presentation/email-templates.controller';
import { NotificationPreferencesController } from './presentation/notification-preferences.controller';
import { MailController } from './presentation/mail.controller';

@Module({
  imports: [IdentityModule, NotificationCoreModule],
  controllers: [
    NotificationsController,
    RemindersController,
    EmailTemplatesController,
    NotificationPreferencesController,
    MailController,
  ],
  providers: [
    NotificationApplicationService,
    NotificationScanService,
    NotificationScanCron,
    ReminderApplicationService,
    EmailTemplateApplicationService,
    NotificationPreferenceApplicationService,
    MailApplicationService,
    ReminderRepository,
    EmailTemplateRepository,
    NotificationPreferenceRepository,
    OutboundEmailLogRepository,
  ],
  exports: [
    NotificationCoreModule,
    NotificationApplicationService,
    ReminderApplicationService,
    MailApplicationService,
    NotificationPreferenceApplicationService,
  ],
})
export class CommunicationModule {}
