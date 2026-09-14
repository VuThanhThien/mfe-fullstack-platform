/**
 * NotifyContext — shell-owned channel for remotes to surface user-facing
 * feedback (Snackbar). One typed callback; not an event bus.
 *
 * The payload is the SDK's `RemoteNotification` so the shell Snackbar and the
 * mount contract cannot drift apart.
 */
import { createContext, useContext } from 'react';
import type { RemoteNotification } from '@mfe/sdk';

export type OnNotify = (n: RemoteNotification) => void;

export const NotifyContext = createContext<OnNotify | null>(null);

/** Returns the shell onNotify callback, or null outside ShellLayout. */
export function useOnNotify(): OnNotify | null {
  return useContext(NotifyContext);
}
