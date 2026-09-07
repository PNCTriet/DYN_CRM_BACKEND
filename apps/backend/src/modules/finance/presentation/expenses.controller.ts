import {
  Body,
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
import { ExpenseApplicationService } from '../application/expense.application-service';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  ReviewExpenseDto,
} from '../application/dto/expense.dto';

@ApiTags('expenses')
@ApiBearerAuth('bearer')
@Controller('expenses')
@UseGuards(AuthGuard, RbacGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpenseApplicationService) {}

  @Post()
  @RequirePermission('expense.create')
  @ApiOperation({ summary: 'Create expense request' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Get()
  @RequirePermission('expense.view')
  @ApiOperation({ summary: 'List expenses' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListExpensesQueryDto) {
    return this.expenses.list(user, query);
  }

  @Get(':id')
  @RequirePermission('expense.view')
  @ApiOperation({ summary: 'Get expense by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenses.getById(user, id);
  }

  @Post(':id/approve')
  @RequirePermission('expense.approve')
  @ApiOperation({ summary: 'Approve expense' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewExpenseDto,
  ) {
    return this.expenses.approve(user, id, dto);
  }

  @Post(':id/reject')
  @RequirePermission('expense.approve')
  @ApiOperation({ summary: 'Reject expense' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewExpenseDto,
  ) {
    return this.expenses.reject(user, id, dto);
  }
}
