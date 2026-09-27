import { Global, Module } from '@nestjs/common';
import { MailPort } from './mail.port';
import { ResendMailAdapter } from './resend-mail.adapter';

@Global()
@Module({
  providers: [{ provide: MailPort, useClass: ResendMailAdapter }],
  exports: [MailPort],
})
export class MailModule {}
