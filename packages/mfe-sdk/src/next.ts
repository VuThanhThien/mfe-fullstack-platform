/**
 * Navigation sanitizers — prevent open redirects via `?next=`.
 *
 * - `safeNext` — shell/landing: only `/app…`
 * - `safeStandalonePath` — standalone SPA: same-origin relative paths only
 */

export type RedirectPolicy = 'shell' | 'standalone';

let _redirectPolicy: RedirectPolicy = 'shell';

/** Shell default. Standalone `main.tsx` must call `setRedirectPolicy('standalone')`. */
export function setRedirectPolicy(policy: RedirectPolicy): void {
  _redirectPolicy = policy;
}

/** Current policy (tests / diagnostics). */
export function getRedirectPolicy(): RedirectPolicy {
  return _redirectPolicy;
}

/**
 * Sanitise a ?next= value so it can only navigate within the shell app.
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

/**
 * Same-origin relative path for standalone remotes/landing-like SPAs.
 * Rejects absolute URLs, protocol-relative `//…`, and backslash tricks.
 */
export function safeStandalonePath(
  value: string | null | undefined,
  fallback = '/',
): string {
  if (!value) return fallback;
  // Must be a single-slash relative path (not //host).
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  // Reject schemes / backslashes (open-redirect / browser-quirk vectors).
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(value) || value.includes('\\')) {
    return fallback;
  }
  return value;
}

/** Pick sanitizer from the active redirect policy. */
export function sanitizeNextForPolicy(
  value: string | null | undefined,
): string {
  return _redirectPolicy === 'standalone'
    ? safeStandalonePath(value, '/')
    : safeNext(value);
}
