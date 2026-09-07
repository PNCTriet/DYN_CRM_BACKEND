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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { CustomerApplicationService } from '../application/customer.application-service';
import { CreateCustomerDto } from '../application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../application/dto/update-customer.dto';
import { ListCustomersQueryDto } from '../application/dto/list-customers-query.dto';

@ApiTags('customers')
@ApiBearerAuth('bearer')
@Controller('customers')
@UseGuards(AuthGuard, RbacGuard)
export class CustomersController {
  constructor(private readonly customers: CustomerApplicationService) {}

  @Post()
  @RequirePermission('customer.create')
  @ApiOperation({ summary: 'Create customer' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }

  @Get()
  @RequirePermission('customer.view')
  @ApiOperation({ summary: 'List customers (scoped)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListCustomersQueryDto) {
    return this.customers.list(user, query);
  }

  @Get(':id')
  @RequirePermission('customer.view')
  @ApiOperation({ summary: 'Get customer by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('customer.update')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('customer.delete')
  @ApiOperation({ summary: 'Soft-delete customer' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.customers.softDelete(user, id);
  }
}
