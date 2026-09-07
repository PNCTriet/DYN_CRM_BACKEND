import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ReminderApplicationService } from '../application/reminder.application-service';
import {
  CreateReminderDto,
  ListRemindersQueryDto,
  UpdateReminderDto,
} from '../application/dto/reminder.dto';

@ApiTags('reminders')
@ApiBearerAuth('bearer')
@Controller('reminders')
@UseGuards(AuthGuard, RbacGuard)
export class RemindersController {
  constructor(private readonly reminders: ReminderApplicationService) {}

  @Post()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Create reminder' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReminderDto) {
    return this.reminders.create(user, dto);
  }

  @Get()
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'List own reminders' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListRemindersQueryDto) {
    return this.reminders.list(user, query);
  }

  @Get(':id')
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Get reminder by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reminders.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Update reminder' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminders.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Delete reminder' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reminders.remove(user, id);
  }

  @Post(':id/complete')
  @RequirePermission('notification.view_own')
  @ApiOperation({ summary: 'Mark reminder completed' })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reminders.complete(user, id);
  }
}
