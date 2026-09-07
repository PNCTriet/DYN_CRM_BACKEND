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
import { ListNotificationsQueryDto } from '../application/dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(AuthGuard, RbacGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationApplicationService,
  ) {}

  @Get()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'List own notifications' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.listOwn(user, query);
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
