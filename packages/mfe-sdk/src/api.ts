/**
 * API wrapper — Bearer injection and 401 refresh/retry live in the axios
 * interceptors (`http.ts`); this module is a thin, typed facade over them.
 *
 * Contract (plan "chosen contract for B"):
 * - `api.get|post|patch|put|delete` resolve with `AxiosResponse<T>`
 *   (read the payload from `res.data`).
 * - Any non-2xx, network, or timeout failure rejects with the SDK's `ApiError`
 *   (`{ status, body, message }`), so callers have ONE error shape across auth
 *   and api. `status` is `0` when the request never reached the server.
 *
 * The previous fetch-era contract resolved with `Response` even on 4xx/5xx and
 * required `await res.json()`; call sites were updated accordingly in P4.
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { ApiError } from './errors.js';
import { http, setRedirect } from './http.js';

// Preserved public export: tests and `index.ts` import `setRedirect` from here.
export { setRedirect };

/** Convert anything axios throws into the SDK's single error shape. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    return new ApiError(
      error.message || `request failed (${status})`,
      status,
      error.response?.data,
    );
  }

  return new ApiError(
    error instanceof Error ? error.message : 'request failed',
    0,
  );
}

async function send<T>(
  run: () => Promise<AxiosResponse<T>>,
): Promise<AxiosResponse<T>> {
  try {
    return await run();
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  get<T = unknown>(
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return send(() => http.get<T>(path, config));
  },

  post<T = unknown>(
    path: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return send(() => http.post<T>(path, body, config));
  },

  put<T = unknown>(
    path: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return send(() => http.put<T>(path, body, config));
  },

  patch<T = unknown>(
    path: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return send(() => http.patch<T>(path, body, config));
  },

  delete<T = unknown>(
    path: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    // Keeps the pre-axios call shape `delete(path, body?, config?)`; axios
    // carries a DELETE payload on `config.data`.
    return send(() =>
      http.delete<T>(path, {
        ...config,
        ...(body !== undefined ? { data: body } : {}),
      }),
    );
  },
};
