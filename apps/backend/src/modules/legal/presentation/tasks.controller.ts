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
import { TaskApplicationService } from '../application/task.application-service';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateTaskDto,
} from '../application/dto/task.dto';

@ApiTags('tasks')
@ApiBearerAuth('bearer')
@Controller('tasks')
@UseGuards(AuthGuard, RbacGuard)
export class TasksController {
  constructor(private readonly tasks: TaskApplicationService) {}

  @Post()
  @RequirePermission('task.create')
  @ApiOperation({ summary: 'Create task' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Get()
  @RequirePermission('task.view')
  @ApiOperation({ summary: 'List tasks (scoped)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListTasksQueryDto) {
    return this.tasks.list(user, query);
  }

  @Get(':id')
  @RequirePermission('task.view')
  @ApiOperation({ summary: 'Get task by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasks.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('task.update')
  @ApiOperation({ summary: 'Update task' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('task.update')
  @ApiOperation({ summary: 'Delete task' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tasks.remove(user, id);
  }
}
