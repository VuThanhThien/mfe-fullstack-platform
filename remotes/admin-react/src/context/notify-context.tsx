/**
 * Optional shell onNotify — provided when mounted via federation;
 * undefined in standalone vite preview (main.tsx).
 */
import type { RemoteNotification } from '@mfe/sdk';
import { createContext, useContext, type ReactNode } from 'react';

export type OnNotify = (n: RemoteNotification) => void;

const NotifyContext = createContext<OnNotify | undefined>(undefined);

export function NotifyProvider({
  onNotify,
  children,
}: {
  onNotify?: OnNotify;
  children: ReactNode;
}) {
  return (
    <NotifyContext.Provider value={onNotify}>{children}</NotifyContext.Provider>
  );
}

export function useNotify(): OnNotify | undefined {
  return useContext(NotifyContext);
}
