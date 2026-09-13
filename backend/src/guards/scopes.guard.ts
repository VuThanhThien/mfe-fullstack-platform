import { JwtPayloadType } from '@/api/auth/types/jwt-payload.type';
import { REQUIRED_SCOPES } from '@/constants/app.constant';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Global authorization guard, registered *after* `AuthGuard` (registration
 * order is execution order, and `AuthGuard` is what populates `request.user`).
 *
 * Scope membership is read from the access token, so a grant/revocation takes
 * effect on the next refresh (<= 15m). Endpoints that must be exact re-read the
 * database instead (see `MfeConfigService.findAccessible`).
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES,
      [context.getHandler(), context.getClass()],
    );

    // Not a scope-gated route.
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest()['user'] as
      | JwtPayloadType
      | undefined;

    // A scope-gated handler reached without a user means it was also decorated
    // with @Public()/@AuthOptional() — treat that as a misconfiguration, not as
    // an anonymous pass.
    if (!user) throw new UnauthorizedException();

    const owned = new Set(user.scopes ?? []);
    const isAllowed = required.every((scope) => owned.has(scope));

    if (!isAllowed) throw new ForbiddenException();

    return true;
  }
}
