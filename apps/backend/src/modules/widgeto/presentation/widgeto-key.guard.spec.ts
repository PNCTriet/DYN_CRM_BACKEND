import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WIDGETO_KEY_HEADER,
  WidgetoKeyGuard,
} from './widgeto-key.guard';

describe('WidgetoKeyGuard', () => {
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;
  const guard = new WidgetoKeyGuard(config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeContext(key?: string) {
    const headers: Record<string, string | undefined> = {};
    if (key !== undefined) headers[WIDGETO_KEY_HEADER] = key;
    const req = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as never;
  }

  it('accepts matching X-Widgeto-Key', () => {
    (config.get as jest.Mock).mockReturnValue('secret-abc');
    expect(guard.canActivate(makeContext('secret-abc'))).toBe(true);
  });

  it('accepts matching query ?key=', () => {
    (config.get as jest.Mock).mockReturnValue('secret-abc');
    const req = {
      headers: {},
      query: { key: 'secret-abc' },
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as never;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects missing header', () => {
    (config.get as jest.Mock).mockReturnValue('secret-abc');
    expect(() => guard.canActivate(makeContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects wrong key', () => {
    (config.get as jest.Mock).mockReturnValue('secret-abc');
    expect(() => guard.canActivate(makeContext('wrong'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when WIDGETO_API_KEY is not configured', () => {
    (config.get as jest.Mock).mockReturnValue(undefined);
    expect(() => guard.canActivate(makeContext('anything'))).toThrow(
      UnauthorizedException,
    );
  });
});
