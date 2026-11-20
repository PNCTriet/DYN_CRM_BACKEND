import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { NotificationApplicationService } from '../application/notification.application-service';
import { NotificationScanService } from '../application/notification-scan.service';
import {
  ListNotificationsQueryDto,
  MarkAllNotificationsQueryDto,
} from '../application/dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(AuthGuard, RbacGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationApplicationService,
    private readonly scan: NotificationScanService,
  ) {}

  @Get('unread-count')
  @RequirePermission('notification.view_own')
  @ApiOperation({
    summary: 'Unread counts for the current user, total and by sidebar category',
  })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Get()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'List own notifications' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.listOwn(user, query);
  }

  @Post('read-all')
  @RequirePermission('notification.view_own')
  @ApiOperation({
    summary: 'Mark all own unread notifications read, optionally one category',
  })
  markAllRead(
    @CurrentUser() user: AuthUser,
    @Query() query: MarkAllNotificationsQueryDto,
  ) {
    return this.notifications.markAllRead(user, query.category);
  }

  @Post('scan')
  @RequirePermission('config.manage')
  @ApiOperation({
    summary:
      'Run the daily overdue scan now (07:00 Asia/Ho_Chi_Minh cron uses the same job). Idempotent.',
  })
  scanNow() {
    return this.scan.run(new Date());
  }

  @Post(':id/read')
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user, id);
  }
}
