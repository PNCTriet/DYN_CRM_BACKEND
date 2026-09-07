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
import { LeadApplicationService } from '../application/lead.application-service';
import { CreateLeadDto } from '../application/dto/create-lead.dto';
import { UpdateLeadDto } from '../application/dto/update-lead.dto';
import { ListLeadsQueryDto } from '../application/dto/list-leads-query.dto';
import { ConvertLeadDto } from '../application/dto/convert-lead.dto';

@ApiTags('leads')
@ApiBearerAuth('bearer')
@Controller('leads')
@UseGuards(AuthGuard, RbacGuard)
export class LeadsController {
  constructor(private readonly leads: LeadApplicationService) {}

  @Post()
  @RequirePermission('lead.create')
  @ApiOperation({ summary: 'Create lead' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.leads.create(user, dto);
  }

  @Get()
  @RequirePermission('lead.view')
  @ApiOperation({ summary: 'List leads (scoped)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListLeadsQueryDto) {
    return this.leads.list(user, query);
  }

  @Get(':id')
  @RequirePermission('lead.view')
  @ApiOperation({ summary: 'Get lead by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leads.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('lead.update')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leads.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('lead.delete')
  @ApiOperation({ summary: 'Delete lead (not allowed if CONVERTED)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leads.remove(user, id);
  }

  @Post(':id/convert')
  @RequirePermission('lead.convert')
  @ApiOperation({ summary: 'Convert lead → customer (command)' })
  convert(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.leads.convert(user, id, dto);
  }
}
