import {
  Body,
  Controller,
  Delete,
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
import { EmailTemplateApplicationService } from '../application/email-template.application-service';
import {
  CreateEmailTemplateDto,
  ListEmailTemplatesQueryDto,
  UpdateEmailTemplateDto,
} from '../application/dto/email-template.dto';

@ApiTags('email-templates')
@ApiBearerAuth('bearer')
@Controller('email-templates')
@UseGuards(AuthGuard, RbacGuard)
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplateApplicationService) {}

  @Post()
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Create email template' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmailTemplateDto) {
    return this.templates.create(user, dto);
  }

  @Get()
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'List email templates' })
  list(@Query() query: ListEmailTemplatesQueryDto) {
    return this.templates.list(query);
  }

  @Get(':id')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Get email template' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.getById(id);
  }

  @Patch(':id')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Update email template' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templates.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermission('email.template.manage')
  @ApiOperation({ summary: 'Delete email template' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(id);
  }
}
