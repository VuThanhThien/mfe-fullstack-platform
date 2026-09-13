import { getAccessToken } from '@mfe/sdk';
import type { ReactNode } from 'react';
import { ADMIN_SCOPE } from '../lib/constants';
import { decodeJwtScopes } from '../lib/jwt-scopes';
import { Forbidden } from './Forbidden';

export function SoftGate({ children }: { children: ReactNode }) {
  const scopes = decodeJwtScopes(getAccessToken());
  if (!scopes.includes(ADMIN_SCOPE)) {
    return <Forbidden />;
  }
  return <>{children}</>;
}
