import { REQUIRED_SCOPES } from '@/constants/app.constant';
import { SetMetadata } from '@nestjs/common';

/**
 * Requires the caller to own **all** of the given scopes (AND semantics).
 * Enforced globally by `ScopesGuard`, which runs after `AuthGuard`.
 *
 * @example
 * ```ts
 * @RequireScopes(ADMIN_SCOPE)
 * @Get()
 * findAll() {}
 * ```
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES, scopes);
