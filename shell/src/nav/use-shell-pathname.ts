import { shellPathFromWindow, subscribeLocationChange } from '@mfe/sdk';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Prefer window.location over React Router when they diverge (remote pushState
 * before shell sync). Active nav leaves must track the address bar (pathname-only).
 */
export function useShellPathname(): string {
  const rrPath = useLocation().pathname;
  const [path, setPath] = useState(() => shellPathFromWindow() ?? rrPath);

  useEffect(() => {
    const sync = () => {
      const next = shellPathFromWindow() ?? rrPath;
      setPath((prev: string) => (prev === next ? prev : next));
    };
    sync();
    return subscribeLocationChange(sync);
  }, [rrPath]);

  return path;
}
