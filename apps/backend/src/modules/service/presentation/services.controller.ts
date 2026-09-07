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
import { ServiceApplicationService } from '../application/service.application-service';
import { CreateServiceDto } from '../application/dto/create-service.dto';
import { UpdateServiceDto } from '../application/dto/update-service.dto';
import { ListServicesQueryDto } from '../application/dto/list-services-query.dto';

@ApiTags('services')
@ApiBearerAuth('bearer')
@Controller('services')
@UseGuards(AuthGuard, RbacGuard)
export class ServicesController {
  constructor(private readonly services: ServiceApplicationService) {}

  @Post()
  @RequirePermission('service.create')
  @ApiOperation({ summary: 'Create service catalog item' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    return this.services.create(user, dto);
  }

  @Get()
  @RequirePermission('service.view')
  @ApiOperation({ summary: 'List services (scoped)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListServicesQueryDto) {
    return this.services.list(user, query);
  }

  @Get(':id')
  @RequirePermission('service.view')
  @ApiOperation({ summary: 'Get service by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.services.getById(user, id);
  }

  @Patch(':id')
  @RequirePermission('service.update')
  @ApiOperation({ summary: 'Update service' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(user, id, dto);
  }

  @Post(':id/archive')
  @RequirePermission('service.archive')
  @ApiOperation({ summary: 'Archive service (status → ARCHIVED)' })
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.services.archive(user, id);
  }
}
