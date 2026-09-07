import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { IdentityAccessService } from '../../modules/identity/application/identity-access.service';
import { AuthUser } from '../../modules/identity/domain/auth-user';

/**
 * Resolves current user from Authorization header.
 * AUTH_MODE=test accepts: Bearer test:<userId>
 * Production will swap to AuthPort → Supabase JWT validation.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly identityAccess: IdentityAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    const user = await this.identityAccess.resolveFromToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }
    req.user = user;
    return true;
  }
}
