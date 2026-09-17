/**
 * Per-routeName nav tree cache. Lazy GET; invalidate when accessibles refresh.
 * Memory only — never localStorage. Nav is UX chrome, not ACL.
 */
import type { MfeNavNode } from '@mfe/sdk';
import { ApiError, api } from '@mfe/sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRemoteContext } from './RemoteContext';

type NavViewStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppNavState {
  status: NavViewStatus;
  tree: MfeNavNode[];
  message?: string;
  retry: () => void;
}

const cache = new Map<string, MfeNavNode[]>();
const inflight = new Map<string, Promise<MfeNavNode[]>>();

function navUrl(routeName: string): string {
  return `/api/v1/mfe-configs/by-route/${encodeURIComponent(routeName)}/nav/accessible`;
}

function fetchNav(routeName: string, force = false): Promise<MfeNavNode[]> {
  if (!force) {
    const cached = cache.get(routeName);
    if (cached) return Promise.resolve(cached);
  }

  const pending = inflight.get(routeName);
  if (pending) return pending;

  const req = api.get<MfeNavNode[]>(navUrl(routeName)).then((res) => {
    // Skip cache write if a newer fetch (retry) replaced this inflight entry.
    if (inflight.get(routeName) === req) {
      cache.set(routeName, res.data);
    }
    return res.data;
  });

  inflight.set(routeName, req);
  void req.finally(() => {
    if (inflight.get(routeName) === req) inflight.delete(routeName);
  });

  return req;
}

function dropCached(routeName: string) {
  cache.delete(routeName);
  inflight.delete(routeName);
}

function describeNavError(err: unknown): string {
  if (err instanceof ApiError && err.status === 0) {
    return 'Network error. Check your connection and retry.';
  }
  return "Could not load this app's menu.";
}

const NavEpochContext = createContext(0);

export function NavProvider({ children }: { children: ReactNode }) {
  const { accessibles } = useRemoteContext();
  const [epoch, setEpoch] = useState(0);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    setEpoch((e) => e + 1);
  }, [accessibles]);

  return (
    <NavEpochContext.Provider value={epoch}>
      {children}
    </NavEpochContext.Provider>
  );
}

export function useAppNav(routeName: string | undefined): AppNavState {
  const { accessibles } = useRemoteContext();
  const epoch = useContext(NavEpochContext);
  const [retryTick, setRetryTick] = useState(0);
  const [error, setError] = useState<{
    routeName: string;
    message: string;
  } | null>(null);
  const [, setReadyVersion] = useState(0);
  const lastEpochRef = useRef(epoch);

  const accessible =
    Boolean(routeName) &&
    accessibles.some((item) => item.routeName === routeName);

  const retry = useCallback(() => {
    if (!routeName) return;
    dropCached(routeName);
    setError(null);
    setRetryTick((n) => n + 1);
  }, [routeName]);

  useEffect(() => {
    if (!routeName || !accessible) {
      setError(null);
      return;
    }

    const force = lastEpochRef.current !== epoch;
    lastEpochRef.current = epoch;
    if (!force && cache.has(routeName)) return;

    let cancelled = false;

    void fetchNav(routeName, force).then(
      () => {
        if (cancelled) return;
        setError(null);
        setReadyVersion((n) => n + 1);
      },
      (err: unknown) => {
        if (cancelled) return;
        if (cache.has(routeName)) {
          setError(null);
          setReadyVersion((n) => n + 1);
          return;
        }
        setError({
          routeName,
          message: describeNavError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [routeName, accessible, epoch, retryTick]);

  if (!routeName || !accessible) {
    return { status: 'idle', tree: [], retry };
  }
  const tree = cache.get(routeName);
  if (tree) {
    return { status: 'ready', tree, retry };
  }
  if (error?.routeName === routeName) {
    return { status: 'error', tree: [], message: error.message, retry };
  }
  return { status: 'loading', tree: [], retry };
}
