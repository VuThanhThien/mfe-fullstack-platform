import { ApiError } from '@mfe/sdk';

/** Map login failures to user-facing copy (mirror demo-react standalone). */
export function resolveLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 422) {
      return 'Invalid email or password.';
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (err.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
