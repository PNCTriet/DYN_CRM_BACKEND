import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ServiceApplicationService } from './application/service.application-service';
import { ServicePolicy } from './domain/policies/service.policy';
import { ServiceRepository } from './infrastructure/prisma/service.repository';
import { ServicesController } from './presentation/services.controller';

@Module({
  imports: [IdentityModule],
  controllers: [ServicesController],
  providers: [ServiceApplicationService, ServiceRepository, ServicePolicy],
  exports: [ServiceApplicationService],
})
export class ServiceModule {}
