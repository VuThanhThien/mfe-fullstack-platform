import {
  normPath,
  runWithoutLocationNotify,
  shellPathFromWindow,
  subscribeLocationChange,
} from '@mfe/sdk';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Align shell React Router with window.location when remotes pushState.
 * Pathname-only: search/hash stay on the address bar for remotes (YAGNI for shell).
 * `lastSynced` is updated synchronously before navigate so async replaceState
 * notifications do not re-enter (avoids navigation throttling storms).
 */
export function ShellHistorySync() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastSynced = useRef(normPath(location.pathname));

  useEffect(() => {
    lastSynced.current = normPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const syncFromWindow = () => {
      const next = shellPathFromWindow();
      if (next == null) return;
      const n = normPath(next);
      if (n === lastSynced.current) return;
      lastSynced.current = n;
      runWithoutLocationNotify(() => {
        navigate(next, { replace: true });
      });
    };

    return subscribeLocationChange(syncFromWindow);
  }, [navigate]);

  return null;
}
