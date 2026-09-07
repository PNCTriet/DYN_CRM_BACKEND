import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CollaboratorApplicationService } from './application/collaborator.application-service';
import { ContractRequestApplicationService } from './application/contract-request.application-service';
import { CollaboratorRepository } from './infrastructure/prisma/collaborator.repository';
import { ContractRequestRepository } from './infrastructure/prisma/contract-request.repository';
import { CollaboratorsController } from './presentation/collaborators.controller';
import { ContractRequestsController } from './presentation/contract-requests.controller';

@Module({
  imports: [IdentityModule],
  controllers: [CollaboratorsController, ContractRequestsController],
  providers: [
    CollaboratorApplicationService,
    ContractRequestApplicationService,
    CollaboratorRepository,
    ContractRequestRepository,
  ],
  exports: [
    CollaboratorApplicationService,
    ContractRequestApplicationService,
  ],
})
export class CollaborationModule {}
