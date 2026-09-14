/**
 * RemoteOutlet — lazy-loads a React MFE remote into the current route.
 *
 * Decision tree (spec §4.4, §5.2, §6):
 *   :routeName not in accessible list  → <NotFound>
 *   item.framework !== 'react'         → <Unsupported> (no loadRemote call)
 *   react                              → loadRemote → mount(el, ctx); unmount on cleanup
 *   loadRemote / mount throws          → error panel (outlet only) + Retry button
 *
 * Security:
 * - mount context: { basePath, routeName, locale?, onNotify? } — no token, no user object
 * - nav (ShellLayout) remains visible even when outlet errors
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useEventCallback } from 'usehooks-ts';
import { loadRemote } from '@mfe/sdk';
import type { MfeAccessibleItem, RemoteNotification } from '@mfe/sdk';
import { useOnNotify } from '../context/NotifyContext';
import { useRemoteContext } from '../context/RemoteContext';
import { NotFound } from './NotFound';
import { Unsupported } from './Unsupported';

type MountState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'mounted' }
  | { phase: 'error'; message: string };

export function RemoteOutlet() {
  const { routeName } = useParams<{ routeName: string }>();
  const { accessibles } = useRemoteContext();

  const item: MfeAccessibleItem | undefined = accessibles.find(
    (a) => a.routeName === routeName,
  );

  // ── Guard: unknown routeName ──────────────────────────────────────────────
  if (!item) {
    return <NotFound routeName={routeName} />;
  }

  // ── Guard: non-React framework ────────────────────────────────────────────
  if (item.framework !== 'react') {
    return <Unsupported framework={item.framework} />;
  }

  // ── React remote ──────────────────────────────────────────────────────────
  return <ReactRemote item={item} />;
}

// Separate component so hooks always run consistently for a React remote.
function ReactRemote({ item }: { item: MfeAccessibleItem }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mountState, setMountState] = useState<MountState>({ phase: 'idle' });
  const [retryKey, setRetryKey] = useState(0);
  const onNotify = useOnNotify();
  // Stable identity so the mount effect deps stay string-based (no remount on notify).
  const notify = useEventCallback((n: RemoteNotification) => onNotify?.(n));

  useEffect(() => {
    // Re-runs when item changes (navigation) or retryKey increments
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    // Track the unmount function returned after a successful mount
    let unmountFn: (() => void | Promise<void>) | null = null;

    setMountState({ phase: 'loading' });

    async function doMount() {
      try {
        const remote = await loadRemote(item);
        if (cancelled) return;

        await remote.mount(el!, {
          // basePath is the full path prefix this remote is mounted under
          basePath: `/app/${item.routeName}`,
          routeName: item.routeName,
          locale: document.documentElement.lang || 'en',
          onNotify: notify,
        });

        if (cancelled) {
          // Navigation happened while mount was in flight — clean up immediately
          void remote.unmount();
          return;
        }

        unmountFn = () => remote.unmount();
        setMountState({ phase: 'mounted' });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : `Failed to load "${item.remoteName}"`;
        setMountState({ phase: 'error', message });
      }
    }

    void doMount();

    return () => {
      cancelled = true;
      if (unmountFn) {
        void unmountFn();
        unmountFn = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.routeName, item.remoteEntry, retryKey]);

  const handleRetry = () => {
    setMountState({ phase: 'idle' });
    setRetryKey((k) => k + 1);
  };

  // Error state — show panel inside the outlet; nav stays visible
  if (mountState.phase === 'error') {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
            >
              Retry
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Failed to load &ldquo;{item.title}&rdquo;
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {mountState.message}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {/* Loading overlay while remote is fetching/mounting */}
      {mountState.phase === 'loading' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      {/* Remote mounts into this div — always in the DOM so containerRef is stable */}
      <div ref={containerRef} style={{ height: '100%' }} />
    </Box>
  );
}
