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
import { PaymentApplicationService } from '../application/payment.application-service';
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
} from '../application/dto/payment.dto';

@ApiTags('payments')
@ApiBearerAuth('bearer')
@Controller('payments')
@UseGuards(AuthGuard, RbacGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentApplicationService) {}

  @Post()
  @RequirePermission('payment.create')
  @ApiOperation({ summary: 'Record a payment' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user, dto);
  }

  @Get()
  @RequirePermission('payment.view')
  @ApiOperation({ summary: 'List payments' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListPaymentsQueryDto) {
    return this.payments.list(user, query);
  }

  @Get(':id')
  @RequirePermission('payment.view')
  @ApiOperation({ summary: 'Get payment by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.getById(user, id);
  }

  @Post(':id/verify')
  @RequirePermission('payment.verify')
  @ApiOperation({ summary: 'Verify payment' })
  verify(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.verify(user, id);
  }

  @Post(':id/void')
  @RequirePermission('payment.void')
  @ApiOperation({ summary: 'Void payment' })
  voidPayment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.void(user, id);
  }
}
