import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { ConfigApplicationService } from '../application/config.application-service';
import {
  ListConfigQueryDto,
  UpdateConfigDto,
} from '../application/dto/config.dto';

@ApiTags('config')
@ApiBearerAuth('bearer')
@Controller('config')
@UseGuards(AuthGuard, RbacGuard)
export class ConfigController {
  constructor(private readonly config: ConfigApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'List config keys (or filter by ?key=)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListConfigQueryDto) {
    return this.config.list(user, query);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get config by key' })
  getOne(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    return this.config.getByKey(user, key);
  }

  @Patch(':key')
  @RequirePermission('config.manage')
  @ApiOperation({ summary: 'Upsert config valueJson' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.config.update(user, key, dto);
  }
}
