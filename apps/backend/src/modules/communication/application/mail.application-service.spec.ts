import { ServiceUnavailableException } from '@nestjs/common';
import { MailPort } from '../../../common/mail/mail.port';
import { NotificationPublisher } from './notification.publisher';
import { EmailTemplateRepository } from '../infrastructure/prisma/email-template.repository';
import { OutboundEmailLogRepository } from '../infrastructure/prisma/outbound-email-log.repository';
import { NotificationPreferenceApplicationService } from './notification-preference.application-service';
import { MailApplicationService } from './mail.application-service';

function logRow(id: string, status: string) {
  return {
    id,
    toAddress: 'client@example.com',
    fromAddress: 'ops@dny.local',
    templateKey: 'mail.test',
    subject: 'Hello An',
    providerMessageId: status === 'SENT' ? 'prov-1' : null,
    status,
    errorMessage: status === 'FAILED' ? 'Email provider error: rejected' : null,
    relatedNotificationId: null,
    createdAt: new Date('2026-11-20T01:00:00.000Z'),
  };
}

describe('MailApplicationService delivery notifications', () => {
  const mail = {
    isConfigured: jest.fn(),
    getDefaultFrom: jest.fn().mockReturnValue('ops@dny.local'),
    send: jest.fn(),
  };
  const templates = {
    findByKey: jest.fn().mockResolvedValue({
      isActive: true,
      subject: 'Hello {{name}}',
      htmlBody: '<p>{{name}}</p>',
      textBody: null,
    }),
  };
  const logs = { create: jest.fn() };
  const preferences = { isChannelEnabled: jest.fn().mockResolvedValue(false) };
  const notifications = {
    notify: jest.fn().mockResolvedValue({ inserted: 1, existing: 0 }),
  };

  const service = new MailApplicationService(
    mail as unknown as MailPort,
    templates as unknown as EmailTemplateRepository,
    logs as unknown as OutboundEmailLogRepository,
    preferences as unknown as NotificationPreferenceApplicationService,
    notifications as unknown as NotificationPublisher,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    templates.findByKey.mockResolvedValue({
      isActive: true,
      subject: 'Hello {{name}}',
      htmlBody: '<p>{{name}}</p>',
      textBody: null,
    });
    mail.getDefaultFrom.mockReturnValue('ops@dny.local');
    notifications.notify.mockResolvedValue({ inserted: 1, existing: 0 });
  });

  it('notifies the actor when Resend accepts the message', async () => {
    mail.send.mockResolvedValue({ providerMessageId: 'prov-1' });
    logs.create.mockResolvedValue(logRow('log-sent', 'SENT'));

    await service.sendTemplated(
      { templateKey: 'mail.test', to: 'client@example.com', variables: { name: 'An' } },
      'actor-1',
    );

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email_sent',
        recipientUserIds: ['actor-1'],
        sourceType: 'email',
        sourceId: 'log-sent',
        href: '/emails',
        dedupeKey: 'email_sent:log-sent',
      }),
    );
  });

  it('notifies the actor when Resend fails, then rethrows', async () => {
    mail.send.mockRejectedValue(new ServiceUnavailableException('Email provider error: rejected'));
    logs.create.mockResolvedValue(logRow('log-fail', 'FAILED'));

    await expect(
      service.sendTemplated(
        { templateKey: 'mail.test', to: 'client@example.com', variables: { name: 'An' } },
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email_failed',
        recipientUserIds: ['actor-1'],
        dedupeKey: 'email_failed:log-fail',
        href: '/emails',
      }),
    );
  });

  it('falls back to recipientUserId and skips preference-disabled sends', async () => {
    mail.send.mockResolvedValue({ providerMessageId: 'prov-1' });
    logs.create.mockResolvedValue(logRow('log-2', 'SENT'));
    preferences.isChannelEnabled.mockResolvedValueOnce(true);
    await service.sendTemplated({
      templateKey: 'mail.test',
      to: 'client@example.com',
      variables: { name: 'An' },
      recipientUserId: 'inbox-user',
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email_sent',
        recipientUserIds: ['inbox-user'],
      }),
    );

    notifications.notify.mockClear();
    preferences.isChannelEnabled.mockResolvedValueOnce(false);
    logs.create.mockResolvedValue(logRow('log-skip', 'SKIPPED'));
    await service.sendTemplated({
      templateKey: 'mail.test',
      to: 'client@example.com',
      recipientUserId: 'inbox-user',
      variables: { name: 'An' },
    });
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
