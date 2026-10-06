import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import {
  resolveVerifiedSubject,
  SupabaseJwtVerifier,
} from './supabase-jwt.verifier';

const secret = 'test-secret-test-secret-test-secret';
const issuer = 'https://example.supabase.co/auth/v1';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function sign(
  payload: Record<string, unknown> = {},
  options: jwt.SignOptions = {},
  key = secret,
) {
  return jwt.sign({ email: 'a@b.c', role: 'authenticated', ...payload }, key, {
    algorithm: 'HS256',
    subject: 'sub-1',
    issuer,
    audience: 'authenticated',
    expiresIn: 60,
    ...options,
  });
}

describe('SupabaseJwtVerifier', () => {
  const verifier = new SupabaseJwtVerifier(
    configWith({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_JWT_SECRET: secret,
    }),
  );

  it('accepts a locally signed HS256 access token', async () => {
    const result = await verifier.verify(sign());
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.subject).toMatchObject({
      subjectId: 'sub-1',
      email: 'a@b.c',
    });
    expect(result.subject.permissionCodes).toBeUndefined();
  });

  it('reads hook claims only when both arrays are present', async () => {
    const result = await verifier.verify(
      sign({
        crm_permissions: ['order.view', 'order.update'],
        crm_role_codes: ['SALES'],
        user_metadata: { full_name: 'Ada' },
      }),
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.subject.permissionCodes).toEqual(['order.view', 'order.update']);
    expect(result.subject.roleCodes).toEqual(['SALES']);
    expect(result.subject.displayName).toBe('Ada');
  });

  it('rejects expired, bad-signature, and non-JWT tokens', async () => {
    const expired = jwt.sign(
      { email: 'a@b.c', exp: Math.floor(Date.now() / 1000) - 30 },
      secret,
      {
        algorithm: 'HS256',
        subject: 'sub-1',
        issuer,
        audience: 'authenticated',
      },
    );
    expect((await verifier.verify(expired)).status).toBe('invalid');
    expect((await verifier.verify(sign({}, {}, 'other-secret-other-secret-other'))).status).toBe(
      'invalid',
    );
    expect((await verifier.verify('not-a-jwt')).status).toBe('invalid');

    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
      'base64url',
    );
    const body = Buffer.from(
      JSON.stringify({ sub: 'sub-1', exp: Math.floor(Date.now() / 1000) + 60 }),
    ).toString('base64url');
    expect((await verifier.verify(`${header}.${body}.`)).status).toBe('invalid');
  });

  it('reports HS256 unavailable when the JWT secret is not configured', async () => {
    const open = new SupabaseJwtVerifier(
      configWith({ SUPABASE_URL: 'https://example.supabase.co' }),
    );
    expect((await open.verify(sign())).status).toBe('unavailable');
  });
});

describe('resolveVerifiedSubject', () => {
  const subject = { subjectId: 'sub-1', email: 'a@b.c' };

  it('does not call the network for a valid or rejected token', async () => {
    const network = jest.fn();
    await expect(
      resolveVerifiedSubject(
        't',
        { verify: async () => ({ status: 'valid', subject }) },
        network,
      ),
    ).resolves.toEqual(subject);
    await expect(
      resolveVerifiedSubject('t', { verify: async () => ({ status: 'invalid' }) }, network),
    ).resolves.toBeNull();
    expect(network).not.toHaveBeenCalled();
  });

  it('falls back to the network only when local verify cannot run', async () => {
    const network = jest.fn().mockResolvedValue(subject);
    await expect(
      resolveVerifiedSubject(
        't',
        { verify: async () => ({ status: 'unavailable' }) },
        network,
      ),
    ).resolves.toEqual(subject);
    expect(network).toHaveBeenCalledWith('t');
  });
});
