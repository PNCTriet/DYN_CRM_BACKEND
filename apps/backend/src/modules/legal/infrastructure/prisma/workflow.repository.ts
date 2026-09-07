import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTemplate(
    data: Prisma.WorkflowTemplateCreateInput,
    stages?: Array<{
      name: string;
      sortOrder: number;
      responsibleRoleCode?: string;
    }>,
  ) {
    return this.prisma.workflowTemplate.create({
      data: {
        ...data,
        ...(stages?.length
          ? {
              stages: {
                create: stages.map((s) => ({
                  name: s.name,
                  sortOrder: s.sortOrder,
                  responsibleRoleCode: s.responsibleRoleCode,
                })),
              },
            }
          : {}),
      },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findTemplateById(id: string) {
    return this.prisma.workflowTemplate.findFirst({
      where: { id },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  listTemplates() {
    return this.prisma.workflowTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  updateTemplate(id: string, data: Prisma.WorkflowTemplateUpdateInput) {
    return this.prisma.workflowTemplate.update({
      where: { id },
      data,
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  listStages(templateId: string) {
    return this.prisma.workflowStage.findMany({
      where: { templateId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findFirstStage(templateId: string) {
    return this.prisma.workflowStage.findFirst({
      where: { templateId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findStage(id: string) {
    return this.prisma.workflowStage.findFirst({ where: { id } });
  }

  findContract(id: string) {
    return this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
    });
  }

  createInstance(data: Prisma.WorkflowInstanceCreateInput) {
    return this.prisma.workflowInstance.create({
      data,
      include: {
        currentStage: true,
        template: { select: { id: true, name: true } },
      },
    });
  }

  findInstanceById(id: string) {
    return this.prisma.workflowInstance.findFirst({
      where: { id },
      include: {
        currentStage: true,
        template: { select: { id: true, name: true } },
      },
    });
  }

  updateInstance(id: string, data: Prisma.WorkflowInstanceUpdateInput) {
    return this.prisma.workflowInstance.update({
      where: { id },
      data,
      include: {
        currentStage: true,
        template: { select: { id: true, name: true } },
      },
    });
  }
}
