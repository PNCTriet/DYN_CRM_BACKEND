import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ContractApplicationService } from './application/contract.application-service';
import { WorkflowApplicationService } from './application/workflow.application-service';
import { TaskApplicationService } from './application/task.application-service';
import { DocumentApplicationService } from './application/document.application-service';
import { ContractPolicy } from './domain/policies/contract.policy';
import { TaskPolicy } from './domain/policies/task.policy';
import { ContractRepository } from './infrastructure/prisma/contract.repository';
import { WorkflowRepository } from './infrastructure/prisma/workflow.repository';
import { TaskRepository } from './infrastructure/prisma/task.repository';
import { DocumentRepository } from './infrastructure/prisma/document.repository';
import { ContractsController } from './presentation/contracts.controller';
import {
  WorkflowInstancesController,
  WorkflowTemplatesController,
} from './presentation/workflow.controller';
import { TasksController } from './presentation/tasks.controller';
import { DocumentsController } from './presentation/documents.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    ContractsController,
    WorkflowTemplatesController,
    WorkflowInstancesController,
    TasksController,
    DocumentsController,
  ],
  providers: [
    ContractApplicationService,
    WorkflowApplicationService,
    TaskApplicationService,
    DocumentApplicationService,
    ContractRepository,
    WorkflowRepository,
    TaskRepository,
    DocumentRepository,
    ContractPolicy,
    TaskPolicy,
  ],
  exports: [
    ContractApplicationService,
    WorkflowApplicationService,
    TaskApplicationService,
  ],
})
export class LegalModule {}
