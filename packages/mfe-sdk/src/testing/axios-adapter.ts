/**
 * Test-only scripted axios adapter.
 *
 * A custom adapter must "settle" the response itself: axios's built-in adapters
 * call `settle()` (which rejects non-2xx according to `validateStatus`), but
 * `dispatchRequest` does not do it for a user-supplied adapter. Mirroring that
 * behaviour keeps the real interceptor chain under test — Bearer injection,
 * deduped 401 refresh and the single retry — while removing the network.
 */

import {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

export type ScriptedReply = { status?: number; data?: unknown };

export type ScriptedHandler = (
  config: InternalAxiosRequestConfig,
) => ScriptedReply | Promise<ScriptedReply>;

export function scriptedAdapter(handler: ScriptedHandler) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const reply = await handler(config);
    const status = reply.status ?? 200;

    const response: AxiosResponse = {
      data: reply.data ?? {},
      status,
      statusText: String(status),
      headers: {},
      config,
    };

    if (status >= 200 && status < 300) return response;

    throw new AxiosError(
      `Request failed with status code ${status}`,
      String(status),
      config,
      undefined,
      response,
    );
  };
}

/** Install the scripted adapter on an axios instance. */
export function useAdapter(
  instance: AxiosInstance,
  handler: ScriptedHandler,
): void {
  instance.defaults.adapter = scriptedAdapter(handler);
}

/** Read a request header regardless of axios's internal header normalisation. */
export function headerOf(
  config: InternalAxiosRequestConfig,
  name: string,
): string | undefined {
  const headers = config.headers as AxiosRequestHeaders | undefined;
  const value = headers?.get?.(name) ?? headers?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** Recorded request, for asserting against the wire. */
export type RecordedCall = {
  method: string;
  url: string;
  config: InternalAxiosRequestConfig;
};

/** Wrap a handler so every request through it is recorded. */
export function recordingHandler(
  calls: RecordedCall[],
  handler: ScriptedHandler,
): ScriptedHandler {
  return (config) => {
    calls.push({
      method: (config.method ?? 'get').toUpperCase(),
      url: String(config.url),
      config,
    });
    return handler(config);
  };
}
