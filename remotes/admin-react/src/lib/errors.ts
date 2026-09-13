import { ApiError } from '@mfe/sdk';

/** Turn an SDK / Nest failure into a user-visible string. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Cannot reach the server.';
    const body = err.body;
    if (body && typeof body === 'object') {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
      if (Array.isArray(message) && message.length > 0) {
        return message.map(String).join(', ');
      }
    }
    return `${err.status} ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}
