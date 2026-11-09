import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../types/authenticated-user';

function contextWith(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const user: AuthenticatedUser = { id: 1, email: 'u@u.com', role: Role.USER };
  const admin: AuthenticatedUser = {
    id: 2,
    email: 'a@a.com',
    role: Role.ADMIN,
  };

  const requireRoles = (roles: Role[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('allows routes without @Roles()', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextWith(user))).toBe(true);
  });

  it('allows a user with one of the required roles', () => {
    requireRoles([Role.ADMIN]);
    expect(guard.canActivate(contextWith(admin))).toBe(true);
  });

  it('forbids a user without the required role', () => {
    requireRoles([Role.ADMIN]);
    expect(() => guard.canActivate(contextWith(user))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids when no user was loaded (guard order mistake)', () => {
    requireRoles([Role.USER]);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
