import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../identity/domain/auth-user';
import { WorkflowApplicationService } from '../application/workflow.application-service';
import {
  AdvanceWorkflowInstanceDto,
  CreateWorkflowTemplateDto,
  StartWorkflowInstanceDto,
  UpdateWorkflowTemplateDto,
} from '../application/dto/workflow.dto';

@ApiTags('workflow-templates')
@ApiBearerAuth('bearer')
@Controller('workflow-templates')
@UseGuards(AuthGuard, RbacGuard)
export class WorkflowTemplatesController {
  constructor(private readonly workflows: WorkflowApplicationService) {}

  @Post()
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'Create workflow template (optional nested stages)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkflowTemplateDto,
  ) {
    return this.workflows.createTemplate(user, dto);
  }

  @Get()
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'List workflow templates' })
  list() {
    return this.workflows.listTemplates();
  }

  @Get(':id/stages')
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'List stages for a template' })
  listStages(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflows.listStages(id);
  }

  @Get(':id')
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'Get workflow template with stages' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflows.getTemplate(id);
  }

  @Patch(':id')
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'Update workflow template' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
  ) {
    return this.workflows.updateTemplate(user, id, dto);
  }
}

@ApiTags('workflow-instances')
@ApiBearerAuth('bearer')
@Controller('workflow-instances')
@UseGuards(AuthGuard, RbacGuard)
export class WorkflowInstancesController {
  constructor(private readonly workflows: WorkflowApplicationService) {}

  @Post()
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'Start workflow instance at first stage' })
  start(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartWorkflowInstanceDto,
  ) {
    return this.workflows.startInstance(user, dto);
  }

  @Post(':id/advance')
  @RequirePermission('workflow_template.manage')
  @ApiOperation({ summary: 'Advance instance to a stage' })
  advance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdvanceWorkflowInstanceDto,
  ) {
    return this.workflows.advanceInstance(id, dto);
  }
}
