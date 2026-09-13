/**
 * Auth spec (axios era)
 *
 * Must verify:
 * - No writes to localStorage or sessionStorage (locked security rule)
 * - login/register/refresh/logout go through the BARE axios instance with
 *   `withCredentials: true`, and never trigger the refresh-retry interceptor
 * - Access token is kept in module memory only
 * - refresh dedupes: two parallel calls → ONE request
 * - Failed refresh clears the token; logout clears it regardless of the server
 * - Failures reject with `ApiError { status, body }`
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clear,
  getAccessToken,
  login,
  logout,
  refresh,
  register,
} from './auth.js';
import { ApiError } from './errors.js';
import { authHttp } from './http.js';
import {
  recordingHandler,
  useAdapter,
  type RecordedCall,
} from './testing/axios-adapter.js';

const AUTH_BODY = { userId: 'u1', accessToken: 'tok-123', tokenExpires: 9999 };
const REGISTER_BODY = { userId: 'u2' };

let calls: RecordedCall[] = [];

function record(handler: (config: { url?: unknown }) => { status?: number; data?: unknown }) {
  calls = [];
  useAdapter(authHttp, recordingHandler(calls, handler));
}

beforeEach(() => {
  clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Guards: storage is never used ────────────────────────────────────────────

describe('No storage writes (security)', () => {
  it('does not call localStorage.setItem during login/refresh/logout', async () => {
    const lsSetItem = vi.fn();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        setItem: lsSetItem,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    record(() => ({ data: AUTH_BODY }));
    await login({ email: 'a@b.com', password: 'pass' });
    await refresh();
    await logout();

    expect(lsSetItem).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('does not call sessionStorage.setItem during login/refresh/logout', async () => {
    const ssSetItem = vi.fn();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        setItem: ssSetItem,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    record(() => ({ data: AUTH_BODY }));
    await login({ email: 'a@b.com', password: 'pass' });
    await refresh();
    await logout();

    expect(ssSetItem).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as Record<string, unknown>).sessionStorage;
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('stores the access token in memory and returns userId/tokenExpires', async () => {
    record(() => ({ data: AUTH_BODY }));

    const res = await login({ email: 'a@b.com', password: '12345678' });

    expect(res).toEqual({ userId: 'u1', tokenExpires: 9999 });
    expect(getAccessToken()).toBe('tok-123');
    expect(calls[0].url).toBe('/api/v1/auth/email/login');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].config.withCredentials).toBe(true);
  });

  it('rejects with ApiError on failure', async () => {
    record(() => ({ status: 401, data: { message: 'Unauthorized' } }));

    await expect(
      login({ email: 'x', password: 'y' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('does not trigger a refresh-retry when login returns 401', async () => {
    record(() => ({ status: 401, data: {} }));

    await expect(login({ email: 'x', password: 'y' })).rejects.toBeInstanceOf(
      ApiError,
    );

    // Only the login call itself — no refresh attempt behind a bad password.
    expect(calls).toHaveLength(1);
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register()', () => {
  it('returns { userId } without setting an access token', async () => {
    record(() => ({ data: REGISTER_BODY }));

    const res = await register({ email: 'new@b.com', password: 'pass' });

    expect(res.userId).toBe('u2');
    expect(getAccessToken()).toBeNull();
    expect(calls[0].config.withCredentials).toBe(true);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('refresh()', () => {
  it('stores the new access token in memory', async () => {
    record(() => ({
      data: { userId: 'u1', accessToken: 'fresh-tok', tokenExpires: 1234 },
    }));

    const res = await refresh();

    expect(res.userId).toBe('u1');
    expect(getAccessToken()).toBe('fresh-tok');
    expect(calls[0].url).toBe('/api/v1/auth/refresh');
  });

  it('clears the token and throws on failure', async () => {
    record(() => ({ data: AUTH_BODY }));
    await login({ email: 'a@b.com', password: 'pass' });
    expect(getAccessToken()).toBe('tok-123');

    record(() => ({ status: 401, data: {} }));
    await expect(refresh()).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
  });

  it('two parallel calls produce exactly ONE request', async () => {
    let refreshCount = 0;
    calls = [];
    useAdapter(
      authHttp,
      recordingHandler(calls, () => {
        refreshCount += 1;
        return {
          data: { userId: 'u1', accessToken: 'shared-tok', tokenExpires: 9999 },
        };
      }),
    );

    const [r1, r2] = await Promise.all([refresh(), refresh()]);

    expect(refreshCount).toBe(1);
    expect(r1.userId).toBe('u1');
    expect(r2.userId).toBe('u1');
    expect(getAccessToken()).toBe('shared-tok');
  });

  it('allows a later refresh after the in-flight one settles', async () => {
    let refreshCount = 0;
    calls = [];
    useAdapter(
      authHttp,
      recordingHandler(calls, () => {
        refreshCount += 1;
        return { data: { userId: 'u1', accessToken: `tok-${refreshCount}`, tokenExpires: 1 } };
      }),
    );

    await refresh();
    await refresh();

    expect(refreshCount).toBe(2);
    expect(getAccessToken()).toBe('tok-2');
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout()', () => {
  it('clears the token immediately even when the server errors', async () => {
    record(() => ({ data: AUTH_BODY }));
    await login({ email: 'a@b.com', password: 'pass' });
    expect(getAccessToken()).toBe('tok-123');

    record(() => ({ status: 401, data: {} }));
    await expect(logout()).resolves.toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });

  it('sends the Bearer token and withCredentials', async () => {
    record(() => ({ data: AUTH_BODY }));
    await login({ email: 'a@b.com', password: 'pass' });

    calls = [];
    useAdapter(authHttp, recordingHandler(calls, () => ({ data: {} })));
    await logout();

    expect(calls[0].url).toBe('/api/v1/auth/logout');
    expect(calls[0].config.headers.get('Authorization')).toBe('Bearer tok-123');
    expect(calls[0].config.withCredentials).toBe(true);
  });
});
