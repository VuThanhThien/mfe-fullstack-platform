/**
 * Memory router ↔ window.location for hosted Vue remotes.
 * Mirrors React SyncedMemoryRouter using framework-agnostic @mfe/sdk helpers.
 */
import type { Router } from 'vue-router';
import {
  normPath,
  runWithoutLocationNotify,
  stripBasePath,
  subscribeLocationChange,
} from '@mfe/sdk';

export function bindSyncedMemoryLocation(
  router: Router,
  basePath: string,
): () => void {
  let lastMemory = normPath(router.currentRoute.value.path);
  let lastHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const unsubWin = subscribeLocationChange(() => {
    const next = stripBasePath(basePath, window.location.pathname);
    const n = normPath(next);
    if (n === lastMemory) return;
    lastMemory = n;
    runWithoutLocationNotify(() => {
      void router.replace(next);
    });
  });

  const unsubRouter = router.afterEach((to) => {
    lastMemory = normPath(to.path);
    const base = basePath.replace(/\/$/, '');
    const relative = to.fullPath.startsWith('/')
      ? to.fullPath
      : `/${to.fullPath}`;
    const next =
      relative === '/' ? (base === '' ? '/' : base) : `${base}${relative}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === lastHref || next === current) {
      lastHref = current;
      return;
    }
    lastHref = next;
    // Notify shell (pathname-only active leaf). Same pushState policy as React.
    window.history.pushState(window.history.state, '', next);
  });

  return () => {
    unsubWin();
    unsubRouter();
  };
}
