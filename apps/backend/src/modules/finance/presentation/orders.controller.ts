import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { OrderApplicationService } from '../application/order.application-service';
import { CreateOrderDto } from '../application/dto/create-order.dto';
import { UpdateOrderDto } from '../application/dto/update-order.dto';
import { ListOrdersQueryDto } from '../application/dto/list-orders-query.dto';
import {
  ApproveOrderDto,
  AssignOrderDto,
  ChangeOrderStageDto,
} from '../application/dto/order-commands.dto';
import { OrderResponseDto } from '../application/dto/order-response.dto';
import { CreatePaymentScheduleDto } from '../application/dto/payment-schedule.dto';

@ApiTags('orders')
@ApiBearerAuth('bearer')
@Controller('orders')
@UseGuards(AuthGuard, RbacGuard)
export class OrdersController {
  constructor(private readonly orders: OrderApplicationService) {}

  @Post()
  @RequirePermission('order.create')
  @ApiOperation({ summary: 'Create order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Get()
  @RequirePermission('order.view')
  @ApiOperation({ summary: 'List orders (OWN by assignedUserId unless order.assign)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListOrdersQueryDto) {
    return this.orders.list(user, query);
  }

  @Get(':id/detail')
  @RequirePermission('order.view')
  @ApiOperation({
    summary:
      'Aggregate order detail (order + schedule + payments + expenses + documents)',
  })
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getDetail(user, id);
  }

  @Get(':id')
  @RequirePermission('order.view')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiOkResponse({ type: OrderResponseDto })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('order.update')
  @ApiOperation({
    summary: 'Update order fields',
    description:
      'Omit a field to keep the stored value. null clears nullable fields (deadline, zaloGroupUrl, commissionPercent, reviewerUserId, collaboratorId, notes). ' +
      'customerId change also sets the linked contract customer in the same transaction (409 CONTRACT_CUSTOMER_CONFLICT if other orders on that contract use a different customer). ' +
      'serviceId does not change value or deadline. ' +
      'submitterUserId change requires order.update at ALL scope, otherwise 400 SUBMITTER_IMMUTABLE. ' +
      'assignedUserId change requires order.assign; POST /orders/:id/assign remains. ' +
      'deadline is YYYY-MM-DD (Asia/Ho_Chi_Minh civil day). zaloGroupUrl is stored as zaloGroupLink and echoed as both names. ' +
      'Response matches GET /orders/:id, including hydrated names.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(user, id, dto);
  }

  @Post(':id/assign')
  @RequirePermission('order.assign')
  @ApiOperation({ summary: 'Assign order to user' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOrderDto,
  ) {
    return this.orders.assign(user, id, dto);
  }

  @Post(':id/change-stage')
  @RequirePermission('order.change_stage')
  @ApiOperation({ summary: 'Change order stage' })
  changeStage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrderStageDto,
  ) {
    return this.orders.changeStage(user, id, dto);
  }

  @Post(':id/approve')
  @RequirePermission('order.approve')
  @ApiOperation({ summary: 'Approve order' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveOrderDto,
  ) {
    return this.orders.approve(user, id, dto);
  }

  @Get(':orderId/payment-schedule')
  @RequirePermission('order.view')
  @ApiOperation({
    summary:
      'Get payment schedule for order (200 + empty lines when none yet)',
  })
  getSchedule(
    @CurrentUser() user: AuthUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orders.getPaymentSchedule(user, orderId);
  }

  @Post(':orderId/payment-schedule')
  @RequirePermission('order.update')
  @ApiOperation({ summary: 'Create or replace payment schedule' })
  createSchedule(
    @CurrentUser() user: AuthUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentScheduleDto,
  ) {
    return this.orders.createPaymentSchedule(user, orderId, dto);
  }
}
