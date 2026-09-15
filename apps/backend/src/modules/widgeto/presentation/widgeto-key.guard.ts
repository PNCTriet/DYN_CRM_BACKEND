import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

export const WIDGETO_KEY_HEADER = 'x-widgeto-key';

/**
 * Shared-secret gate for /widgeto/* — no JWT / no user session.
 */
@Injectable()
export class WidgetoKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('WIDGETO_API_KEY')?.trim();
    if (!expected) {
      throw new UnauthorizedException('Widgeto API key is not configured');
    }

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const raw = req.headers[WIDGETO_KEY_HEADER];
    const provided = Array.isArray(raw) ? raw[0] : raw;
    if (!provided || typeof provided !== 'string') {
      throw new UnauthorizedException('Invalid Widgeto API key');
    }

    if (!safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid Widgeto API key');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
