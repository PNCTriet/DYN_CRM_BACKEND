import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CrmModule } from './modules/crm/crm.module';
import { ServiceModule } from './modules/service/service.module';
import { LegalModule } from './modules/legal/legal.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '.env'),
    }),
    PrismaModule,
    StorageModule,
    IdentityModule,
    CrmModule,
    ServiceModule,
    LegalModule,
    FinanceModule,
    CollaborationModule,
    CommunicationModule,
    SystemModule,
  ],
})
export class AppModule {}
