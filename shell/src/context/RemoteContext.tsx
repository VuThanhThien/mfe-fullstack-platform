/**
 * RemoteContext — carries accessible MFE items and the authenticated userId
 * throughout the shell after the Gate boot sequence completes.
 */
import { createContext, useContext } from 'react';
import type { MfeAccessibleItem } from '@mfe/sdk';

export interface RemoteContextValue {
  userId: string;
  accessibles: MfeAccessibleItem[];
}

export const RemoteContext = createContext<RemoteContextValue | null>(null);

/**
 * Hook for consuming the remote context.
 * Throws if called outside a <Gate> tree — this is intentional; it surfaces
 * missing provider bugs early rather than returning undefined silently.
 */
export function useRemoteContext(): RemoteContextValue {
  const ctx = useContext(RemoteContext);
  if (!ctx) {
    throw new Error('useRemoteContext must be called inside a <Gate> provider');
  }
  return ctx;
}
