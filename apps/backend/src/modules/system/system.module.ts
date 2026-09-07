import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ConfigApplicationService } from './application/config.application-service';
import { ConfigRepository } from './infrastructure/prisma/config.repository';
import { ConfigController } from './presentation/config.controller';

@Module({
  imports: [IdentityModule],
  controllers: [ConfigController],
  providers: [ConfigApplicationService, ConfigRepository],
  exports: [ConfigApplicationService],
})
export class SystemModule {}
