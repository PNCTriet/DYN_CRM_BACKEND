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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { ContractRequestApplicationService } from '../application/contract-request.application-service';
import {
  ApproveContractRequestDto,
  CreateContractRequestDto,
  ListContractRequestsQueryDto,
  ReviewContractRequestDto,
  UpdateContractRequestDto,
} from '../application/dto/contract-request.dto';

@ApiTags('contract-requests')
@ApiBearerAuth('bearer')
@Controller('contract-requests')
@UseGuards(AuthGuard, RbacGuard)
export class ContractRequestsController {
  constructor(
    private readonly requests: ContractRequestApplicationService,
  ) {}

  @Post()
  @RequirePermission('contract_request.create')
  @ApiOperation({ summary: 'Create contract request' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateContractRequestDto,
  ) {
    return this.requests.create(user, dto);
  }

  @Get()
  @RequirePermission('contract_request.view')
  @ApiOperation({ summary: 'List contract requests' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListContractRequestsQueryDto,
  ) {
    return this.requests.list(user, query);
  }

  @Get(':id')
  @RequirePermission('contract_request.view')
  @ApiOperation({ summary: 'Get contract request by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.requests.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('contract_request.create')
  @ApiOperation({ summary: 'Update contract request (draft/needs_info/submitted)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractRequestDto,
  ) {
    return this.requests.update(user, id, dto);
  }

  @Post(':id/review')
  @RequirePermission('contract_request.review')
  @ApiOperation({ summary: 'Mark request in review' })
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewContractRequestDto,
  ) {
    return this.requests.review(user, id, dto);
  }

  @Post(':id/approve')
  @RequirePermission('contract_request.approve')
  @ApiOperation({ summary: 'Approve contract request (not own)' })
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveContractRequestDto,
  ) {
    return this.requests.approve(user, id, dto);
  }

  @Post(':id/reject')
  @RequirePermission('contract_request.reject')
  @ApiOperation({ summary: 'Reject contract request (not own)' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewContractRequestDto,
  ) {
    return this.requests.reject(user, id, dto);
  }
}
