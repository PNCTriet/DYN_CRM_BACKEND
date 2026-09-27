import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailPort, SendMailInput, SendMailResult } from './mail.port';

/**
 * Resend MailPort adapter.
 * Boots without RESEND_API_KEY (warn only); send() fails clearly until configured.
 */
@Injectable()
export class ResendMailAdapter extends MailPort {
  private readonly logger = new Logger(ResendMailAdapter.name);
  private readonly client: Resend | null;
  private readonly from: string | null;

  constructor(config: ConfigService) {
    super();
    const apiKey = config.get<string>('RESEND_API_KEY')?.trim();
    this.from =
      config.get<string>('MAIL_FROM')?.trim() ||
      config.get<string>('RESEND_FROM')?.trim() ||
      null;

    if (!apiKey) {
      this.client = null;
      this.logger.warn(
        'RESEND_API_KEY missing — MailPort.send will fail until configured',
      );
      return;
    }

    this.client = new Resend(apiKey);
    this.logger.log(
      `Resend MailPort ready from=${this.from ?? '(unset — set MAIL_FROM)'}`,
    );
  }

  isConfigured(): boolean {
    return this.client !== null && !!this.from;
  }

  getDefaultFrom(): string | null {
    return this.from;
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Email is not configured (RESEND_API_KEY)',
      );
    }
    const from = this.from;
    if (!from) {
      throw new ServiceUnavailableException(
        'Email is not configured (MAIL_FROM)',
      );
    }

    const payload = {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html ?? input.text ?? '',
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    };

    const { data, error } = await this.client.emails.send(payload);

    if (error) {
      this.logger.error(`Resend send failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Email provider error: ${error.message}`,
      );
    }

    return { providerMessageId: data?.id ?? null };
  }
}
