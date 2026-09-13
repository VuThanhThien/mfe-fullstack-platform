/**
 * Auth module — the access token lives in module-level memory only.
 *
 * Rules (locked by spec):
 * - NEVER write to localStorage or sessionStorage
 * - `withCredentials: true` on every request (HttpOnly cookie round-trip)
 * - Parallel 401s share ONE in-flight refresh promise
 *
 * Requests go through `authHttp` (the bare axios instance) so that an auth
 * endpoint returning 401 is reported to the caller instead of triggering the
 * refresh-retry interceptor.
 */

import { AxiosError } from 'axios';
import { ApiError } from './errors.js';
import { authHttp } from './http.js';
import { clearAccessToken, getAccessToken, setAccessToken } from './token.js';
import type { AuthResponse, RegisterResponse } from './types.js';

// Re-exported so `import { getAccessToken, clear } from './auth.js'` keeps
// working for existing callers after the token store moved to token.ts.
export { getAccessToken };

export function clear(): void {
  clearAccessToken();
}

/**
 * Single in-flight promise shared by all concurrent refresh callers. Returns the
 * refresh result so every waiter gets the same value — only ONE network request
 * happens regardless of how many parallel 401s fire.
 */
let refreshInflight: Promise<{ userId: string; tokenExpires: number }> | null =
  null;

function toAuthError(error: unknown, fallback: string): ApiError {
  if (error instanceof AxiosError) {
    return new ApiError(
      fallback,
      error.response?.status ?? 0,
      error.response?.data,
    );
  }
  return new ApiError(error instanceof Error ? error.message : fallback, 0);
}

/**
 * POST /api/v1/auth/email/register
 * Returns { userId } only — no cookie, no token.
 */
export async function register(dto: {
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  try {
    const { data } = await authHttp.post<RegisterResponse>(
      '/api/v1/auth/email/register',
      dto,
    );
    return data;
  } catch (error) {
    throw toAuthError(error, 'register failed');
  }
}

/**
 * POST /api/v1/auth/email/login
 * Sets the refresh_token HttpOnly cookie; returns { userId, accessToken, tokenExpires }.
 * Stores the access token in memory.
 */
export async function login(dto: {
  email: string;
  password: string;
}): Promise<{ userId: string; tokenExpires: number }> {
  try {
    const { data } = await authHttp.post<AuthResponse>(
      '/api/v1/auth/email/login',
      dto,
    );
    setAccessToken(data.accessToken);
    return { userId: data.userId, tokenExpires: data.tokenExpires };
  } catch (error) {
    throw toAuthError(error, 'login failed');
  }
}

/**
 * POST /api/v1/auth/refresh — public; reads the HttpOnly cookie automatically.
 * Rotates the cookie and returns a new access token (stored in memory).
 *
 * Concurrent callers share ONE in-flight promise.
 */
export function refresh(): Promise<{ userId: string; tokenExpires: number }> {
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    try {
      const { data } = await authHttp.post<AuthResponse>(
        '/api/v1/auth/refresh',
        {},
      );
      setAccessToken(data.accessToken);
      return { userId: data.userId, tokenExpires: data.tokenExpires };
    } catch (error) {
      clearAccessToken();
      throw toAuthError(error, 'refresh failed');
    }
  })().finally(() => {
    refreshInflight = null;
  });

  return refreshInflight;
}

/**
 * POST /api/v1/auth/logout — requires a valid Bearer token.
 * Clears the in-memory token regardless of the server response (best-effort).
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  clearAccessToken();
  try {
    await authHttp.post('/api/v1/auth/logout', undefined, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // Intentionally swallowed: the user must never be trapped on logout.
  }
}
