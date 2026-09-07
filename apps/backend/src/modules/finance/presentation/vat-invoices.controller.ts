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
import { VatInvoiceApplicationService } from '../application/vat-invoice.application-service';
import {
  CreateVatInvoiceDto,
  IssueVatInvoiceDto,
  ListVatInvoicesQueryDto,
} from '../application/dto/vat-invoice.dto';

@ApiTags('vat-invoices')
@ApiBearerAuth('bearer')
@Controller('vat-invoices')
@UseGuards(AuthGuard, RbacGuard)
export class VatInvoicesController {
  constructor(private readonly invoices: VatInvoiceApplicationService) {}

  @Post()
  @RequirePermission('vat.create')
  @ApiOperation({ summary: 'Create VAT invoice (DRAFT)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVatInvoiceDto) {
    return this.invoices.create(user, dto);
  }

  @Get()
  @RequirePermission('vat.view')
  @ApiOperation({ summary: 'List VAT invoices' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListVatInvoicesQueryDto,
  ) {
    return this.invoices.list(user, query);
  }

  @Get(':id')
  @RequirePermission('vat.view')
  @ApiOperation({ summary: 'Get VAT invoice by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.getById(user, id);
  }

  @Post(':id/issue')
  @RequirePermission('vat.issue')
  @ApiOperation({ summary: 'Issue VAT invoice' })
  issue(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueVatInvoiceDto,
  ) {
    return this.invoices.issue(user, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission('vat.cancel')
  @ApiOperation({ summary: 'Cancel VAT invoice' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoices.cancel(user, id);
  }
}
