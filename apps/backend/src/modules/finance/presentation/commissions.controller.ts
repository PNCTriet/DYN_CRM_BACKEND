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
import { CommissionApplicationService } from '../application/commission.application-service';
import {
  CalculateCommissionDto,
  CreateCommissionDto,
  ListCommissionsQueryDto,
} from '../application/dto/commission.dto';

@ApiTags('commissions')
@ApiBearerAuth('bearer')
@Controller('commissions')
@UseGuards(AuthGuard, RbacGuard)
export class CommissionsController {
  constructor(private readonly commissions: CommissionApplicationService) {}

  @Post()
  @RequirePermission('commission.calculate')
  @ApiOperation({ summary: 'Create commission (calculated from rate × base)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommissionDto) {
    return this.commissions.create(user, dto);
  }

  @Get()
  @RequirePermission('commission.view')
  @ApiOperation({ summary: 'List commissions' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCommissionsQueryDto,
  ) {
    return this.commissions.list(user, query);
  }

  @Get(':id')
  @RequirePermission('commission.view')
  @ApiOperation({ summary: 'Get commission by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissions.getById(user, id);
  }

  @Post(':id/calculate')
  @RequirePermission('commission.calculate')
  @ApiOperation({ summary: 'Recalculate commission amount' })
  calculate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculateCommissionDto,
  ) {
    return this.commissions.calculate(user, id, dto);
  }

  @Post(':id/approve')
  @RequirePermission('commission.approve')
  @ApiOperation({ summary: 'Approve commission' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissions.approve(user, id);
  }

  @Post(':id/pay')
  @RequirePermission('commission.pay')
  @ApiOperation({ summary: 'Mark commission paid' })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissions.pay(user, id);
  }
}
