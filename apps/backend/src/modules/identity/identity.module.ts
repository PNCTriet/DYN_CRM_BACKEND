import { Module } from '@nestjs/common';
import { IdentityAccessService } from './application/identity-access.service';
import { AuthApplicationService } from './application/auth.application-service';
import { IdentityAdminService } from './application/identity-admin.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AuthController } from './presentation/auth.controller';
import {
  UsersController,
  RolesController,
  PermissionsController,
} from './presentation/identity-admin.controller';
import { AuthPort } from './domain/auth.port';
import { SupabaseAuthAdapter } from './infrastructure/supabase/supabase-auth.adapter';

@Module({
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    PermissionsController,
  ],
  providers: [
    IdentityAccessService,
    AuthApplicationService,
    IdentityAdminService,
    AuthGuard,
    RbacGuard,
    { provide: AuthPort, useClass: SupabaseAuthAdapter },
  ],
  exports: [IdentityAccessService, AuthGuard, RbacGuard, AuthPort],
})
export class IdentityModule {}
