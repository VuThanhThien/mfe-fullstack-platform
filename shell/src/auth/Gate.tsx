/**
 * Gate — boot guard for the shell.
 *
 * Boot sequence (spec §4.4, §5.1):
 *   1. refresh()  — hydrates access token from HttpOnly cookie
 *      401 / any error → window.location.assign('/login?next=<currentPath>')
 *   2. GET /api/v1/mfe-configs/accessible  — scoped list for this user
 *   3. registerRemotes(items)              — wires MF runtime with live entries
 *   4. Render children via RemoteContext
 *
 * Security:
 * - Never passes token to children (spec §4.8 / §5.2 "no token in mount ctx")
 * - userId comes from the refresh response body — do NOT decode JWT
 */
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { refresh, api, registerRemotes } from '@mfe/sdk';
import type { MfeAccessibleItem } from '@mfe/sdk';
import { RemoteContext } from '../context/RemoteContext';

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; userId: string; accessibles: MfeAccessibleItem[] }
  | { status: 'redirecting' };

interface GateProps {
  children: ReactNode;
}

export function Gate({ children }: GateProps) {
  const [state, setState] = useState<GateState>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Holds the running promise while a refetch is active, so concurrent callers
  // (focus + visibilitychange fire together) share one request.
  const inFlight = useRef<Promise<void> | null>(null);

  // Shared loader for boot and refetch. The `ready` guard keeps a refetch from
  // downgrading the status back to 'loading'; on boot it is a no-op because
  // `boot()` sets the final state itself.
  const loadAccessibles = useCallback(async (): Promise<MfeAccessibleItem[]> => {
    const { data: items } = await api.get<MfeAccessibleItem[]>(
      '/api/v1/mfe-configs/accessible',
    );
    await registerRemotes(items);
    setState((s) => (s.status === 'ready' ? { ...s, accessibles: items } : s));
    return items;
  }, []);

  // Public refetch: deduped, never downgrades status, swallows failure.
  const refreshAccessibles = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;

    setIsRefreshing(true);
    const run = (async () => {
      try {
        await loadAccessibles();
      } catch {
        // Keep the previous list; do not bounce to /login (boot owns that).
      } finally {
        inFlight.current = null;
        setIsRefreshing(false);
      }
    })();

    inFlight.current = run;
    return run;
  }, [loadAccessibles]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Step 1 — refresh (throws on 401 / expired / missing cookie)
        const { userId } = await refresh();
        if (cancelled) return;

        // Step 2 + 3 — shared loader (fetch + registerRemotes)
        const items = await loadAccessibles();
        if (cancelled) return;

        // Step 4 — hand off to shell
        setState({ status: 'ready', userId, accessibles: items });
      } catch (err) {
        if (cancelled) return;
        // Any boot failure → bounce to login
        // safeNext is not needed here: pathname is always /app/... (our own origin)
        console.error('[Gate] boot failed', err);
        setState({ status: 'redirecting' });
        const next = encodeURIComponent(window.location.pathname);
        window.location.assign(`/login?next=${next}`);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadAccessibles]);
  // Listeners are torn down when status leaves 'ready' (edge case: logout).
  useEffect(() => {
    if (state.status !== 'ready') return;

    const onFocus = () => void refreshAccessibles();
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshAccessibles();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state.status, refreshAccessibles]);

  if (state.status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (state.status === 'redirecting') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Redirecting to login…
        </Typography>
      </Box>
    );
  }

  return (
    <RemoteContext.Provider
      value={{
        userId: state.userId,
        accessibles: state.accessibles,
        refreshAccessibles,
        isRefreshing,
      }}
    >
      {children}
    </RemoteContext.Provider>
  );
}
