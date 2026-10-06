import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type jwksRsa from 'jwks-rsa';
import { AuthSubject } from '../../domain/auth.port';

export type LocalJwtResult =
  | { status: 'valid'; subject: AuthSubject }
  | { status: 'invalid' }
  | { status: 'unavailable' };

/**
 * Verify a Supabase access token locally.
 * HS256 uses SUPABASE_JWT_SECRET (legacy JWT secret).
 * ES256/RS256/EdDSA uses the project JWKS. No dashboard hook is required.
 * `unavailable` means the caller should fall back to Auth getUser.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly logger = new Logger(SupabaseJwtVerifier.name);
  private jwks: jwksRsa.JwksClient | null = null;
  private warnedMissingSecret = false;
  private warnedJwks = false;

  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<LocalJwtResult> {
    try {
      return await this.verifyInner(token);
    } catch (error) {
      if (!this.warnedJwks) {
        this.warnedJwks = true;
        this.logger.warn(
          `Local JWT verify failed open to Auth getUser: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
      return { status: 'unavailable' };
    }
  }

  private async verifyInner(token: string): Promise<LocalJwtResult> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') return { status: 'invalid' };

    const alg = decoded.header.alg;
    const issuer = this.issuer();
    if (!issuer) return { status: 'unavailable' };

    if (alg === 'HS256') {
      const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
      if (!secret) {
        if (!this.warnedMissingSecret) {
          this.warnedMissingSecret = true;
          this.logger.warn(
            'SUPABASE_JWT_SECRET is unset; HS256 access tokens fall back to Supabase Auth getUser',
          );
        }
        return { status: 'unavailable' };
      }
      try {
        const payload = jwt.verify(token, secret, {
          algorithms: ['HS256'],
          issuer,
          audience: 'authenticated',
        });
        return { status: 'valid', subject: this.toSubject(payload) };
      } catch {
        return { status: 'invalid' };
      }
    }

    if (alg === 'ES256' || alg === 'RS256') {
      try {
        const payload = await this.verifyAsymmetric(
          token,
          alg,
          issuer,
          decoded.header.kid,
        );
        return { status: 'valid', subject: this.toSubject(payload) };
      } catch (error) {
        if (this.isRejectedToken(error)) return { status: 'invalid' };
        if (!this.warnedJwks) {
          this.warnedJwks = true;
          this.logger.warn(
            `JWKS verify unavailable (${alg}); falling back to Supabase Auth getUser`,
          );
        }
        return { status: 'unavailable' };
      }
    }

    // jsonwebtoken's typings omit EdDSA. Fall back to Auth getUser rather than reject.
    if (alg === 'EdDSA') return { status: 'unavailable' };

    return { status: 'invalid' };
  }

  private verifyAsymmetric(
    token: string,
    alg: 'ES256' | 'RS256',
    issuer: string,
    kid: string | undefined,
  ): Promise<jwt.JwtPayload | string> {
    const client = this.getJwks();
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          if (!header.kid && !kid) {
            callback(new jwt.JsonWebTokenError('missing kid'));
            return;
          }
          client.getSigningKey(header.kid, (err, key) => {
            if (err || !key) {
              callback(err ?? new Error('Signing key not found'));
              return;
            }
            callback(null, key.getPublicKey());
          });
        },
        { algorithms: [alg], issuer, audience: 'authenticated' },
        (err: Error | null, payload: jwt.JwtPayload | string | undefined) => {
          if (err || !payload) {
            reject(err ?? new jwt.JsonWebTokenError('invalid token'));
            return;
          }
          resolve(payload);
        },
      );
    });
  }

  private getJwks(): jwksRsa.JwksClient {
    if (!this.jwks) {
      // Lazy require: jwks-rsa pulls ESM-only `jose`, which Jest cannot load
      // unless this path actually runs. Node loads it fine for ES256/RS256.
      const createClient = require('jwks-rsa') as (
        options: jwksRsa.Options,
      ) => jwksRsa.JwksClient;
      const url = this.config.get<string>('SUPABASE_URL')!.replace(/\/$/, '');
      this.jwks = createClient({
        jwksUri: `${url}/auth/v1/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 10 * 60 * 1000,
        timeout: 5000,
      });
    }
    return this.jwks;
  }

  private issuer(): string | null {
    const url = this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
    if (!url) return null;
    return `${url}/auth/v1`;
  }

  private isRejectedToken(error: unknown): boolean {
    return (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError ||
      error instanceof jwt.JsonWebTokenError
    );
  }

  private toSubject(payload: jwt.JwtPayload | string): AuthSubject {
    if (typeof payload === 'string' || !payload.sub) {
      throw new jwt.JsonWebTokenError('missing sub');
    }
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      (typeof meta.display_name === 'string' && meta.display_name) ||
      null;
    const permissionCodes = readStringArray(payload.crm_permissions);
    const roleCodes = readStringArray(payload.crm_role_codes);
    return {
      subjectId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      displayName,
      ...(permissionCodes && roleCodes ? { permissionCodes, roleCodes } : {}),
    };
  }
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === 'string')) return undefined;
  return value;
}

/** Local verify when possible; network lookup only when local verify cannot run. */
export async function resolveVerifiedSubject(
  token: string,
  verifier: { verify(token: string): Promise<LocalJwtResult> },
  networkLookup: (token: string) => Promise<AuthSubject | null>,
): Promise<AuthSubject | null> {
  const local = await verifier.verify(token);
  if (local.status === 'valid') return local.subject;
  if (local.status === 'invalid') return null;
  return networkLookup(token);
}
