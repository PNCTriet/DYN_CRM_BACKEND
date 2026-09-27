/** MailPort — transactional email abstraction (Architecture AD MailPort). */

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Resend tags / metadata */
  tags?: Array<{ name: string; value: string }>;
}

export interface SendMailResult {
  providerMessageId: string | null;
}

export abstract class MailPort {
  abstract isConfigured(): boolean;
  abstract getDefaultFrom(): string | null;
  abstract send(input: SendMailInput): Promise<SendMailResult>;
}
