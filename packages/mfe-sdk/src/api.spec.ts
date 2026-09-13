/**
 * API wrapper spec (axios era)
 *
 * Must verify:
 * - Bearer header attached from the in-memory token; absent when there is none
 * - `withCredentials: true` on every request (HttpOnly cookie round-trip)
 * - 401 → exactly one refresh → exactly one retry → success
 * - Two parallel 401s → ONE shared refresh request
 * - Refresh failure / second 401 → clear token + redirect to /login?next=…
 * - Non-2xx rejects with `ApiError { status, body }`
 * - `res.data` carries the parsed payload (AxiosResponse contract)
 *
 * The network is removed with a scripted axios adapter, so the real interceptor
 * chain stays under test.
 */

import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, setRedirect } from './api.js';
import { clear, getAccessToken } from './auth.js';
import { ApiError } from './errors.js';
import { authHttp, http } from './http.js';
import { recordingHandler, useAdapter, type RecordedCall } from './testing/axios-adapter.js';
import { setAccessToken } from './token.js';

const TARGET = '/api/v1/mfe-configs/accessible';
const REFRESH = '/api/v1/auth/refresh';
const AUTH_BODY = { userId: 'u1', accessToken: 'tok-fresh', tokenExpires: 9999 };

let calls: RecordedCall[] = [];
let redirect: ReturnType<typeof vi.fn>;

/** Install one recording scripted adapter on BOTH axios instances. */
function record(handler: (config: InternalAxiosRequestConfig) => { status?: number; data?: unknown }) {
  calls = [];
  const recorded = recordingHandler(calls, handler);
  useAdapter(http, recorded);
  useAdapter(authHttp, recorded);
}

beforeEach(() => {
  clear();
  redirect = vi.fn();
  setRedirect(redirect);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Request construction ─────────────────────────────────────────────────────

describe('api.get()', () => {
  it('resolves with AxiosResponse and sends withCredentials', async () => {
    record(() => ({ data: { ok: true } }));

    const res = await api.get<{ ok: boolean }>(TARGET);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].config.withCredentials).toBe(true);
  });

  it('does not set Authorization when there is no token', async () => {
    record(() => ({ data: {} }));

    await api.get(TARGET);

    expect(calls[0].config.headers.get('Authorization')).toBeFalsy();
  });

  it('attaches the in-memory access token as a Bearer header', async () => {
    setAccessToken('tok-abc');
    record(() => ({ data: {} }));

    await api.get(TARGET);

    expect(calls[0].config.headers.get('Authorization')).toBe('Bearer tok-abc');
  });
});

// ─── 401 → refresh → retry ────────────────────────────────────────────────────

describe('401 → refresh → retry', () => {
  it('refreshes once and retries', async () => {
    let targetAttempts = 0;
    record((config) => {
      if (config.url === REFRESH) return { data: AUTH_BODY };
      targetAttempts += 1;
      return targetAttempts === 1
        ? { status: 401, data: {} }
        : { data: { items: [1] } };
    });

    const res = await api.get<{ items: number[] }>(TARGET);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ items: [1] });
    expect(calls.filter((c) => c.url === TARGET)).toHaveLength(2); // original + retry
    expect(calls.filter((c) => c.url === REFRESH)).toHaveLength(1); // exactly one refresh
    expect(redirect).not.toHaveBeenCalled();
  });

  it('shares ONE refresh between two parallel 401s', async () => {
    let targetAttempts = 0;
    let refreshCount = 0;
    record((config) => {
      if (config.url === REFRESH) {
        refreshCount += 1;
        return { data: AUTH_BODY };
      }
      targetAttempts += 1;
      return targetAttempts <= 2 ? { status: 401, data: {} } : { data: {} };
    });

    const [a, b] = await Promise.all([api.get(TARGET), api.get(TARGET)]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refreshCount).toBe(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('clears the token and redirects when the refresh itself fails', async () => {
    setAccessToken('stale');
    record((config) =>
      config.url === REFRESH
        ? { status: 401, data: { message: 'no session' } }
        : { status: 401, data: {} },
    );

    await expect(api.get(TARGET)).rejects.toBeInstanceOf(ApiError);

    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?next='),
    );
    expect(getAccessToken()).toBeNull();
  });

  it('redirects when the retry still returns 401 (dead session)', async () => {
    setAccessToken('stale');
    record((config) =>
      config.url === REFRESH ? { data: AUTH_BODY } : { status: 401, data: {} },
    );

    await expect(api.get(TARGET)).rejects.toBeInstanceOf(ApiError);

    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?next='),
    );
    expect(getAccessToken()).toBeNull();
  });
});

// ─── Error shape ──────────────────────────────────────────────────────────────

describe('error normalisation', () => {
  it('rejects non-2xx with ApiError carrying status and body', async () => {
    record(() => ({
      status: 409,
      data: { message: 'Scope already exists', errorCode: 'E005' },
    }));

    await expect(
      api.post('/api/v1/scopes', { name: 'DUP' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      body: { errorCode: 'E005' },
    });
  });

  it('reports status 0 for a transport failure', async () => {
    calls = [];
    useAdapter(http, () => {
      throw new Error('socket hang up');
    });
    useAdapter(authHttp, () => {
      throw new Error('socket hang up');
    });

    await expect(api.get(TARGET)).rejects.toMatchObject({ status: 0 });
  });
});

// ─── Verbs ────────────────────────────────────────────────────────────────────

describe('api verbs', () => {
  it('sends the right method and JSON body', async () => {
    const expectations: Array<[string, () => Promise<unknown>]> = [
      ['POST', () => api.post('/api/v1/thing', { name: 'test' })],
      ['PUT', () => api.put('/api/v1/thing/1', { name: 'updated' })],
      ['PATCH', () => api.patch('/api/v1/thing/1', { name: 'partial' })],
      ['DELETE', () => api.delete('/api/v1/thing/1')],
    ];

    for (const [method, run] of expectations) {
      record(() => ({ data: {} }));
      await run();
      expect(calls[0].method).toBe(method);
    }
  });

  it('api.post serialises the body to JSON', async () => {
    record(() => ({ data: { created: true } }));

    await api.post('/api/v1/thing', { name: 'test' });

    expect(calls[0].config.data).toBe(JSON.stringify({ name: 'test' }));
  });
});
