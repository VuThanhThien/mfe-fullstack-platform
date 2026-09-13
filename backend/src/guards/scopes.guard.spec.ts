import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { REQUIRED_SCOPES } from '@/constants/app.constant';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopesGuard } from './scopes.guard';

describe('ScopesGuard', () => {
  let guard: ScopesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const contextFor = (user?: Partial<JwtPayloadType>) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new ScopesGuard(reflector as unknown as Reflector);
  });

  it('passes when the route declares no required scopes', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor({ scopes: [] }))).toBe(true);
  });

  it('passes when the user owns the required scope', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(
      guard.canActivate(contextFor({ scopes: ['DASHBOARD', 'ADMIN'] })),
    ).toBe(true);
  });

  it('throws 403 when the user does not own the required scope', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() =>
      guard.canActivate(contextFor({ scopes: ['DASHBOARD'] })),
    ).toThrow(ForbiddenException);
  });

  it('throws 401 when a scoped route has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('requires every listed scope (AND semantics)', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'DASHBOARD']);

    expect(() => guard.canActivate(contextFor({ scopes: ['ADMIN'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('treats a user with no scopes as owning nothing', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(contextFor({}))).toThrow(ForbiddenException);
  });

  it('reads metadata from the handler and the class', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    guard.canActivate(contextFor());

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRED_SCOPES, [
      expect.anything(),
      expect.anything(),
    ]);
  });
});
