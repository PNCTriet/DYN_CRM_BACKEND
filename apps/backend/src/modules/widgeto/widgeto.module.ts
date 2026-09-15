import { Module } from '@nestjs/common';
import { WidgetoApplicationService } from './application/widgeto.application-service';
import { WidgetoController } from './presentation/widgeto.controller';
import { WidgetoKeyGuard } from './presentation/widgeto-key.guard';

@Module({
  controllers: [WidgetoController],
  providers: [WidgetoApplicationService, WidgetoKeyGuard],
})
export class WidgetoModule {}
