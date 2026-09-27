import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { NotificationPreferenceApplicationService } from '../application/notification-preference.application-service';
import { UpsertNotificationPreferenceDto } from '../application/dto/mail.dto';

@ApiTags('notification-preferences')
@ApiBearerAuth('bearer')
@Controller('notification-preferences')
@UseGuards(AuthGuard, RbacGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferences: NotificationPreferenceApplicationService,
  ) {}

  @Get()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'List own notification channel preferences' })
  list(@CurrentUser() user: AuthUser) {
    return this.preferences.listOwn(user);
  }

  @Put()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Upsert one preference (own)' })
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertNotificationPreferenceDto,
  ) {
    return this.preferences.upsertOwn(user, dto);
  }
}
