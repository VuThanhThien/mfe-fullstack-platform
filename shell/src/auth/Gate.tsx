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
import { useState, useEffect, type ReactNode } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Step 1 — refresh (throws on 401 / expired / missing cookie)
        const { userId } = await refresh();
        if (cancelled) return;

        // Step 2 — fetch accessible configs.
        // axios resolves with AxiosResponse, so the payload is `data`; any
        // non-2xx (other than the 401 the SDK already handled) rejects with
        // ApiError and lands in the catch below.
        const { data: items } = await api.get<MfeAccessibleItem[]>(
          '/api/v1/mfe-configs/accessible',
        );
        if (cancelled) return;

        // Step 3 — register all remotes with MF runtime (safe to call with empty [])
        await registerRemotes(items);
        if (cancelled) return;

        // Step 4 — hand off to shell
        setState({ status: 'ready', userId, accessibles: items });
      } catch {
        if (cancelled) return;
        // Any boot failure → bounce to login
        // safeNext is not needed here: pathname is always /app/... (our own origin)
        setState({ status: 'redirecting' });
        const next = encodeURIComponent(window.location.pathname);
        window.location.assign(`/login?next=${next}`);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

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
      value={{ userId: state.userId, accessibles: state.accessibles }}
    >
      {children}
    </RemoteContext.Provider>
  );
}
