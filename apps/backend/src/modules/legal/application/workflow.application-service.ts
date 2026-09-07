import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../identity/domain/auth-user';
import { WorkflowRepository } from '../infrastructure/prisma/workflow.repository';
import {
  AdvanceWorkflowInstanceDto,
  CreateWorkflowTemplateDto,
  StartWorkflowInstanceDto,
  UpdateWorkflowTemplateDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowApplicationService {
  constructor(private readonly repo: WorkflowRepository) {}

  createTemplate(user: AuthUser, dto: CreateWorkflowTemplateDto) {
    return this.repo.createTemplate(
      {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
      dto.stages,
    );
  }

  listTemplates() {
    return this.repo.listTemplates();
  }

  async getTemplate(id: string) {
    const tpl = await this.repo.findTemplateById(id);
    if (!tpl) throw new NotFoundException('Workflow template not found');
    return tpl;
  }

  async updateTemplate(
    user: AuthUser,
    id: string,
    dto: UpdateWorkflowTemplateDto,
  ) {
    const existing = await this.repo.findTemplateById(id);
    if (!existing) throw new NotFoundException('Workflow template not found');
    return this.repo.updateTemplate(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      updatedByUserId: user.id,
    });
  }

  async listStages(templateId: string) {
    const tpl = await this.repo.findTemplateById(templateId);
    if (!tpl) throw new NotFoundException('Workflow template not found');
    return this.repo.listStages(templateId);
  }

  async startInstance(user: AuthUser, dto: StartWorkflowInstanceDto) {
    const contract = await this.repo.findContract(dto.contractId);
    if (!contract) throw new NotFoundException('Contract not found');

    const template = await this.repo.findTemplateById(dto.templateId);
    if (!template) throw new NotFoundException('Workflow template not found');
    if (!template.isActive) {
      throw new BadRequestException('Workflow template is inactive');
    }

    const firstStage = await this.repo.findFirstStage(dto.templateId);
    if (!firstStage) {
      throw new BadRequestException('Template has no stages');
    }

    return this.repo.createInstance({
      contract: { connect: { id: dto.contractId } },
      template: { connect: { id: dto.templateId } },
      currentStage: { connect: { id: firstStage.id } },
      startedAt: new Date(),
    });
  }

  async advanceInstance(id: string, dto: AdvanceWorkflowInstanceDto) {
    const instance = await this.repo.findInstanceById(id);
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const stage = await this.repo.findStage(dto.stageId);
    if (!stage) throw new NotFoundException('Workflow stage not found');
    if (stage.templateId !== instance.templateId) {
      throw new BadRequestException('Stage does not belong to instance template');
    }

    const stages = await this.repo.listStages(instance.templateId);
    const last = stages[stages.length - 1];
    const completedAt =
      last && last.id === dto.stageId ? new Date() : undefined;

    return this.repo.updateInstance(id, {
      currentStage: { connect: { id: dto.stageId } },
      ...(completedAt ? { completedAt } : {}),
    });
  }
}
