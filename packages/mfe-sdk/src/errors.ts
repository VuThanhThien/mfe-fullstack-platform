/**
 * Normalised error for every SDK network failure.
 *
 * Both the auth helpers and the `api` wrapper reject with this shape, so callers
 * only ever need one error contract:
 *
 * ```ts
 * try {
 *   await api.post('/api/v1/scopes', body);
 * } catch (err) {
 *   if (err instanceof ApiError && err.status === 409) { ... }
 * }
 * ```
 *
 * `status` is `0` when the request never reached the server (network error,
 * timeout, aborted request). `body` is the parsed response body when the server
 * sent one.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
