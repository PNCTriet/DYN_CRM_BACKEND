import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { MailApplicationService } from '../application/mail.application-service';
import {
  ListOutboundEmailsQueryDto,
  SendTemplatedMailDto,
  SendTestMailDto,
} from '../application/dto/send-mail.dto';

@ApiTags('mail')
@ApiBearerAuth('bearer')
@Controller('mail')
@UseGuards(AuthGuard, RbacGuard)
export class MailController {
  constructor(private readonly mail: MailApplicationService) {}

  @Get('status')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Resend / MailPort configuration status' })
  status() {
    return this.mail.status();
  }

  @Get('outbound')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'List outbound email logs' })
  listOutbound(@Query() query: ListOutboundEmailsQueryDto) {
    return this.mail.listLogs(query);
  }

  @Post('test')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Send test email via template mail.test' })
  sendTest(@CurrentUser() user: AuthUser, @Body() dto: SendTestMailDto) {
    return this.mail.sendTest(user, dto);
  }

  @Post('send')
  @RequirePermission('email.template.manage')
  @ApiOperation({
    summary: 'Send templated email (admin / integration)',
  })
  send(@Body() dto: SendTemplatedMailDto) {
    return this.mail.sendTemplated(dto);
  }
}
