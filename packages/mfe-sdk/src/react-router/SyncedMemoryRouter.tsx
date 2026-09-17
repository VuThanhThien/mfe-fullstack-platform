import { useEffect, useRef, type ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import {
  runWithoutLocationNotify,
  subscribeLocationChange,
} from '../location-sync.js';
import { normPath, stripBasePath } from '../path-utils.js';

/**
 * Nested MemoryRouter ↔ window.location, without remount or replaceState storms.
 * Hosted React remotes MUST use this instead of nesting BrowserRouter under shell.
 */
export function SyncedMemoryRouter({
  basePath,
  children,
}: {
  basePath: string;
  children: ReactNode;
}) {
  const initial = stripBasePath(basePath, window.location.pathname);
  return (
    <MemoryRouter initialEntries={[initial]}>
      <WindowToMemory basePath={basePath} />
      <MemoryToWindow basePath={basePath} />
      {children}
    </MemoryRouter>
  );
}

function WindowToMemory({ basePath }: { basePath: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const last = useRef(normPath(location.pathname));

  useEffect(() => {
    last.current = normPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    return subscribeLocationChange(() => {
      const next = stripBasePath(basePath, window.location.pathname);
      const n = normPath(next);
      if (n === last.current) return;
      last.current = n;
      runWithoutLocationNotify(() => {
        navigate(next, { replace: true });
      });
    });
  }, [basePath, navigate]);

  return null;
}

function MemoryToWindow({ basePath }: { basePath: string }) {
  const location = useLocation();
  const lastHref = useRef(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  useEffect(() => {
    const base = basePath.replace(/\/$/, '');
    const pathPart =
      location.pathname === '/'
        ? base === ''
          ? '/'
          : base
        : `${base}${location.pathname}`;
    const next = `${pathPart}${location.search}${location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === lastHref.current || next === current) {
      lastHref.current = current;
      return;
    }
    lastHref.current = next;
    // Notify shell (and WindowToMemory guards). Always pushState — memory
    // replace ≠ browser replace (accepted; see plan review notes).
    window.history.pushState(window.history.state, '', next);
  }, [basePath, location.pathname, location.search, location.hash]);

  return null;
}
