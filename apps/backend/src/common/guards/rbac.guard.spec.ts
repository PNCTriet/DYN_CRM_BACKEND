import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { AuthUser } from '../../modules/identity/domain/auth-user';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

function mockContext(user?: AuthUser) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('RbacGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RbacGuard(reflector);

  it('allows when no permission metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('allows when permission granted', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('customer.view');
    const user: AuthUser = {
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'ACTIVE',
      permissions: ['customer.view'],
      roleCodes: ['SALES'],
    };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('denies when permission missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('customer.delete');
    const user: AuthUser = {
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'ACTIVE',
      permissions: ['customer.view'],
      roleCodes: ['SALES'],
    };
    expect(() => guard.canActivate(mockContext(user))).toThrow(ForbiddenException);
  });

  it('denies unknown permission when not on user', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('unknown.action');
    const user: AuthUser = {
      id: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      status: 'ACTIVE',
      permissions: ['customer.view'],
      roleCodes: ['SALES'],
    };
    expect(() => guard.canActivate(mockContext(user))).toThrow(ForbiddenException);
  });

  it('reads PERMISSION_KEY metadata key', () => {
    expect(PERMISSION_KEY).toBe('required_permission');
  });
});
