/**
 * Sanitise a ?next= value so it can only navigate within the app.
 *
 * Only paths matching ^/app(/.*)?$ are considered safe.
 * Everything else (including absolute URLs, evil.test, bare /, /login, etc.)
 * falls back to /app so the user lands somewhere sane.
 *
 * @param value - Raw value from query-string or current pathname
 * @returns A safe intra-app path
 */
export function safeNext(value: string | null | undefined): string {
  const SAFE_RE = /^\/app(\/.*)?$/;
  if (value && SAFE_RE.test(value)) return value;
  return '/app';
}
