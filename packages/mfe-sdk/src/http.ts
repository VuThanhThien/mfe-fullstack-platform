/**
 * HTTP layer — the ONLY place in the platform that touches axios.
 *
 * Two instances, deliberately:
 *
 * - `authHttp` — bare. Used for `/auth/login|register|refresh|logout`. An auth
 *   endpoint answering 401 means "bad credentials", NOT "expired access token",
 *   so it must never trigger the refresh-retry interceptor (that would turn a
 *   wrong password into a refresh loop and a redirect).
 * - `http` — Bearer injection + one deduped refresh-and-retry on 401.
 *
 * Import-cycle note: `auth.ts` imports `authHttp` from here, so this module must
 * not import `auth.ts` at module scope. The 401 handler therefore pulls `refresh`
 * in lazily, and the access token lives in the dependency-free `token.ts`.
 */

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { safeNext } from './next.js';
import { clearAccessToken, getAccessToken } from './token.js';

/** Injectable redirect — defaults to browser navigation; tests override it. */
type RedirectFn = (url: string) => void;

let _redirect: RedirectFn = (url: string) => {
  // Only runs in a browser; unit tests inject a mock via setRedirect().
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
};

/** Override the redirect function (used in tests or SSR environments). */
export function setRedirect(fn: RedirectFn): void {
  _redirect = fn;
}

/** Marks a request that has already been retried once after a refresh. */
type RetriableConfig = InternalAxiosRequestConfig & { _isRetry?: boolean };

/** Cookie round-trip is mandatory: the refresh token is HttpOnly. */
const BASE_CONFIG = { withCredentials: true } as const;

/** Bare instance for the auth endpoints — no auth interceptors. */
export const authHttp = axios.create({ ...BASE_CONFIG });

/** Main instance used by `api` — Bearer header + 401 refresh/retry. */
export const http = axios.create({ ...BASE_CONFIG });

function redirectToLogin(): void {
  const next = safeNext(
    typeof window !== 'undefined' ? window.location.pathname : '/app',
  );
  _redirect(`/login?next=${encodeURIComponent(next)}`);
}

// ─── Request: attach the in-memory access token ───────────────────────────────

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ─── Response: one deduped refresh + retry on 401 ─────────────────────────────

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    // Not an auth problem — propagate untouched.
    if (error.response?.status !== 401 || !config) {
      return Promise.reject(error);
    }

    // A second 401 after a successful refresh means the session is dead
    // (blacklisted, revoked, or the user was deleted).
    if (config._isRetry) {
      clearAccessToken();
      redirectToLogin();
      return Promise.reject(error);
    }

    config._isRetry = true;

    try {
      // Lazy import: static `import { refresh } from './auth.js'` would create
      // an auth ↔ http cycle, because auth.ts imports authHttp from this file.
      // `refresh()` already dedupes concurrent callers via `refreshInflight`,
      // so N parallel 401s still produce exactly one network refresh.
      const { refresh } = await import('./auth.js');
      await refresh();
    } catch {
      clearAccessToken();
      redirectToLogin();
      return Promise.reject(error);
    }

    const token = getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    // Retry exactly once. A 401 here re-enters this handler with `_isRetry`
    // set and falls into the branch above.
    return http.request(config);
  },
);
