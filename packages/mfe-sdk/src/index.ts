/**
 * @mfe/sdk — public surface
 *
 * Contract: spec §5.4
 */

// Auth
export {
  clear,
  getAccessToken,
  login,
  logout,
  refresh,
  register,
} from './auth.js';

// API wrapper
export { api, setRedirect, toApiError } from './api.js';

// Errors — the single rejection shape for auth + api failures
export { ApiError } from './errors.js';

// Remote loader
export {
  clearMfRuntime,
  loadRemote,
  registerRemotes,
  setMfRuntime,
  toRuntimeEntry,
} from './remote.js';
export type { MfRuntime } from './remote.js';

// Navigation helpers
export {
  getRedirectPolicy,
  safeNext,
  safeStandalonePath,
  sanitizeNextForPolicy,
  setRedirectPolicy,
} from './next.js';
export type { RedirectPolicy } from './next.js';

export {
  runWithoutLocationNotify,
  subscribeLocationChange,
} from './location-sync.js';

export {
  normPath,
  shellPathFromWindow,
  stripBasePath,
} from './path-utils.js';

// SyncedMemoryRouter lives at '@mfe/sdk/react-router' (optional React peers)

// Types
export type {
  AuthResponse,
  MfeAccessibleItem,
  MfeNavNode,
  MfeRemoteRef,
  RegisterResponse,
  RemoteModule,
  RemoteMountContext,
  RemoteNotification,
} from './types.js';
