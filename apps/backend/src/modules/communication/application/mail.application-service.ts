import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MailPort } from '../../../common/mail/mail.port';
import { AuthUser } from '../../identity/domain/auth-user';
import { EmailTemplateRepository } from '../infrastructure/prisma/email-template.repository';
import { OutboundEmailLogRepository } from '../infrastructure/prisma/outbound-email-log.repository';
import { NotificationPreferenceApplicationService } from './notification-preference.application-service';
import { NotificationPublisher } from './notification.publisher';
import { renderTemplate } from './render-template';
import {
  ListOutboundEmailsQueryDto,
  OutboundEmailLogResponseDto,
  SendTemplatedMailDto,
  SendTestMailDto,
} from './dto/send-mail.dto';

export type SendMailOutcome = {
  skipped: boolean;
  reason?: string;
  log: OutboundEmailLogResponseDto;
};

@Injectable()
export class MailApplicationService {
  private readonly logger = new Logger(MailApplicationService.name);

  constructor(
    private readonly mail: MailPort,
    private readonly templates: EmailTemplateRepository,
    private readonly logs: OutboundEmailLogRepository,
    private readonly preferences: NotificationPreferenceApplicationService,
    private readonly notifications: NotificationPublisher,
  ) {}

  status() {
    return {
      configured: this.mail.isConfigured(),
      from: this.mail.getDefaultFrom(),
    };
  }

  async listLogs(query: ListOutboundEmailsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, total] = await this.logs.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      templateKey: query.templateKey,
    });
    return {
      items: rows.map((r) => OutboundEmailLogResponseDto.from(r)),
      total,
      page,
      pageSize,
    };
  }

  async sendTest(user: AuthUser, dto: SendTestMailDto): Promise<SendMailOutcome> {
    return this.sendTemplated(
      {
        templateKey: 'mail.test',
        to: dto.to,
        variables: {
          time: new Date().toISOString(),
        },
        eventType: 'mail.test',
      },
      user.id,
    );
  }

  async sendTemplated(
    dto: SendTemplatedMailDto,
    actorUserId?: string,
  ): Promise<SendMailOutcome> {
    const eventType = dto.eventType ?? dto.templateKey;

    if (dto.recipientUserId) {
      const enabled = await this.preferences.isChannelEnabled(
        dto.recipientUserId,
        'EMAIL',
        eventType,
      );
      if (!enabled) {
        const log = await this.logs.create({
          toAddress: dto.to,
          fromAddress: this.mail.getDefaultFrom(),
          templateKey: dto.templateKey,
          subject: null,
          status: 'SKIPPED',
          errorMessage: 'User disabled EMAIL for this event',
          ...(dto.relatedNotificationId
            ? {
                notification: {
                  connect: { id: dto.relatedNotificationId },
                },
              }
            : {}),
        });
        return {
          skipped: true,
          reason: 'preference_disabled',
          log: OutboundEmailLogResponseDto.from(log),
        };
      }
    }

    const template = await this.templates.findByKey(dto.templateKey);
    if (!template || !template.isActive) {
      throw new NotFoundException(
        `Email template not found or inactive: ${dto.templateKey}`,
      );
    }

    const vars = dto.variables ?? {};
    const subject = renderTemplate(template.subject, vars);
    const html = renderTemplate(template.htmlBody, vars);
    const text = template.textBody
      ? renderTemplate(template.textBody, vars)
      : undefined;

    try {
      const result = await this.mail.send({
        to: dto.to,
        subject,
        html,
        text,
        tags: [
          { name: 'template_key', value: dto.templateKey.slice(0, 50) },
        ],
      });

      const log = await this.logs.create({
        toAddress: dto.to,
        fromAddress: this.mail.getDefaultFrom(),
        templateKey: dto.templateKey,
        subject,
        providerMessageId: result.providerMessageId,
        status: 'SENT',
        ...(dto.relatedNotificationId
          ? {
              notification: { connect: { id: dto.relatedNotificationId } },
            }
          : {}),
      });
      await this.notifyDelivery({
        failed: false,
        logId: log.id,
        subject,
        toAddress: dto.to,
        actorUserId,
        recipientUserId: dto.recipientUserId,
      });

      return {
        skipped: false,
        log: OutboundEmailLogResponseDto.from(log),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`sendTemplated failed: ${message}`);
      const log = await this.logs.create({
        toAddress: dto.to,
        fromAddress: this.mail.getDefaultFrom(),
        templateKey: dto.templateKey,
        subject,
        status: 'FAILED',
        errorMessage: message,
        ...(dto.relatedNotificationId
          ? {
              notification: { connect: { id: dto.relatedNotificationId } },
            }
          : {}),
      });
      await this.notifyDelivery({
        failed: true,
        logId: log.id,
        subject,
        toAddress: dto.to,
        errorMessage: message,
        actorUserId,
        recipientUserId: dto.recipientUserId,
      });
      throw err;
    }
  }

  /**
   * Inbox row for the person who triggered the send. Falls back to
   * `recipientUserId` when the call has no actor (no preference-skip rows).
   */
  private async notifyDelivery(input: {
    failed: boolean;
    logId: string;
    subject: string | null;
    toAddress: string;
    errorMessage?: string;
    actorUserId?: string;
    recipientUserId?: string;
  }): Promise<void> {
    const recipientUserId = input.actorUserId || input.recipientUserId;
    if (!recipientUserId) return;
    const type = input.failed ? 'email_failed' : 'email_sent';
    const subject = input.subject?.trim() || input.toAddress;
    await this.notifications.notify({
      recipientUserIds: [recipientUserId],
      type,
      title: input.failed
        ? `Gửi email thất bại: ${subject}`
        : `Email đã gửi: ${subject}`,
      body: input.failed
        ? (input.errorMessage ?? input.toAddress).slice(0, 500)
        : `Đến ${input.toAddress}`,
      sourceType: 'email',
      sourceId: input.logId,
      href: '/emails',
      dedupeKey: `${type}:${input.logId}`,
    });
  }
}
