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
import { ContractApplicationService } from '../application/contract.application-service';
import { CreateContractDto } from '../application/dto/create-contract.dto';
import { UpdateContractDto } from '../application/dto/update-contract.dto';
import { ListContractsQueryDto } from '../application/dto/list-contracts-query.dto';
import { ChangeContractStatusDto } from '../application/dto/change-contract-status.dto';

@ApiTags('contracts')
@ApiBearerAuth('bearer')
@Controller('contracts')
@UseGuards(AuthGuard, RbacGuard)
export class ContractsController {
  constructor(private readonly contracts: ContractApplicationService) {}

  @Post()
  @RequirePermission('contract.create')
  @ApiOperation({ summary: 'Create contract (status DRAFT)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @Get()
  @RequirePermission('contract.view')
  @ApiOperation({ summary: 'List contracts (scoped via customer owner)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListContractsQueryDto) {
    return this.contracts.list(user, query);
  }

  @Get(':id')
  @RequirePermission('contract.view')
  @ApiOperation({ summary: 'Get contract by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contracts.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('contract.update')
  @ApiOperation({ summary: 'Update contract fields' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contracts.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('contract.delete')
  @ApiOperation({ summary: 'Soft-delete contract' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.contracts.softDelete(user, id);
  }

  @Post(':id/change-status')
  @RequirePermission('contract.change_status')
  @ApiOperation({ summary: 'Change contract status (command)' })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeContractStatusDto,
  ) {
    return this.contracts.changeStatus(user, id, dto);
  }
}
