/**
 * Path helpers for shell / SyncedMemoryRouter (no React).
 */

export function normPath(path: string): string {
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

/** Strip absolute `basePath` prefix → router-relative path (leading `/`). */
export function stripBasePath(basePath: string, abs: string): string {
  const base = basePath.replace(/\/$/, '');
  if (!abs.startsWith(base)) return '/';
  const rest = abs.slice(base.length) || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/**
 * Shell path from address bar (basename stripped), or null if outside basename.
 * Default basename `/app` matches shell Vite base + BrowserRouter.
 */
export function shellPathFromWindow(
  pathname: string = typeof window !== 'undefined'
    ? window.location.pathname
    : '',
  basename = '/app',
): string | null {
  if (pathname === basename || pathname === `${basename}/`) return '/';
  if (!pathname.startsWith(`${basename}/`)) return null;
  return pathname.slice(basename.length) || '/';
}
