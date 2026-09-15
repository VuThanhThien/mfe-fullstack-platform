/**
 * @mfe/sdk — public surface
 *
 * Contract: spec §5.4
 */

// Auth
export { login, register, refresh, logout, getAccessToken, clear } from './auth.js';

// API wrapper
export { api, setRedirect, toApiError } from './api.js';

// Errors — the single rejection shape for auth + api failures
export { ApiError } from './errors.js';

// Remote loader
export { registerRemotes, loadRemote, toRuntimeEntry } from './remote.js';

// Navigation helpers
export {
  safeNext,
  safeStandalonePath,
  setRedirectPolicy,
  getRedirectPolicy,
  sanitizeNextForPolicy,
} from './next.js';
export type { RedirectPolicy } from './next.js';

// Types
export type {
  MfeRemoteRef,
  RemoteMountContext,
  RemoteNotification,
  RemoteModule,
  MfeAccessibleItem,
  AuthResponse,
  RegisterResponse,
} from './types.js';
