import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { ImportApplicationService } from '../application/import.application-service';
import {
  AddImportRowsDto,
  CreateImportBatchDto,
} from '../application/dto/import.dto';

@ApiTags('imports')
@ApiBearerAuth('bearer')
@Controller('imports/batches')
@UseGuards(AuthGuard, RbacGuard)
export class ImportsController {
  constructor(private readonly imports: ImportApplicationService) {}

  @Post()
  @RequirePermission('lead.import')
  @ApiOperation({ summary: 'Create import batch' })
  createBatch(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateImportBatchDto,
  ) {
    return this.imports.createBatch(user, dto);
  }

  @Post(':id/rows')
  @RequirePermission('lead.import')
  @ApiOperation({ summary: 'Add rows to import batch (bulk)' })
  addRows(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddImportRowsDto,
  ) {
    return this.imports.addRows(user, id, dto);
  }

  @Post(':id/commit')
  @RequirePermission('lead.import')
  @ApiOperation({ summary: 'Commit valid rows as leads' })
  commit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.imports.commit(user, id);
  }
}
