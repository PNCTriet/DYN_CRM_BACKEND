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
import { CollaboratorApplicationService } from '../application/collaborator.application-service';
import {
  AssignCollaboratorCustomerDto,
  CreateCollaboratorDto,
  ListCollaboratorsQueryDto,
  UpdateCollaboratorDto,
} from '../application/dto/collaborator.dto';

@ApiTags('collaborators')
@ApiBearerAuth('bearer')
@Controller('collaborators')
@UseGuards(AuthGuard, RbacGuard)
export class CollaboratorsController {
  constructor(private readonly collaborators: CollaboratorApplicationService) {}

  @Post()
  @RequirePermission('collaborator.create')
  @ApiOperation({ summary: 'Create collaborator profile' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCollaboratorDto) {
    return this.collaborators.create(user, dto);
  }

  @Get()
  @RequirePermission('collaborator.view')
  @ApiOperation({ summary: 'List collaborators' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCollaboratorsQueryDto,
  ) {
    return this.collaborators.list(user, query);
  }

  @Get(':id')
  @RequirePermission('collaborator.view')
  @ApiOperation({ summary: 'Get collaborator by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.collaborators.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('collaborator.update')
  @ApiOperation({ summary: 'Update collaborator' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollaboratorDto,
  ) {
    return this.collaborators.update(user, id, dto);
  }

  @Post(':id/deactivate')
  @RequirePermission('collaborator.deactivate')
  @ApiOperation({ summary: 'Deactivate collaborator' })
  deactivate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.collaborators.deactivate(user, id);
  }

  @Post(':id/customers')
  @RequirePermission('collaborator_customer.assign')
  @ApiOperation({ summary: 'Assign customer to collaborator' })
  assignCustomer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCollaboratorCustomerDto,
  ) {
    return this.collaborators.assignCustomer(user, id, dto);
  }

  @Delete(':id/customers/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('collaborator_customer.assign')
  @ApiOperation({ summary: 'Unassign customer from collaborator' })
  async unassignCustomer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    await this.collaborators.unassignCustomer(user, id, customerId);
  }

  @Get(':id/customers')
  @RequirePermission('collaborator.view')
  @ApiOperation({ summary: 'List customers assigned to collaborator' })
  listCustomers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.collaborators.listCustomers(user, id);
  }
}
