/**
 * A reference to a micro-frontend remote and the module it exposes.
 */
export interface MfeRemoteRef {
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
}

/**
 * User-facing feedback a remote hands back to the shell.
 * Never carries internals — remotes send messages already passed through
 * their own error describer.
 */
export interface RemoteNotification {
  level: 'info' | 'success' | 'error';
  message: string;
}

/**
 * Mount context passed from shell → remote.
 * Additive optional fields only — no token, no user object, no event bus.
 */
export interface RemoteMountContext {
  basePath: string;
  routeName: string;
  /** Optional UI locale hint (e.g. document.documentElement.lang). */
  locale?: string;
  /** One-way, user-facing feedback to the shell Snackbar. NOT an event bus. */
  onNotify?: (n: RemoteNotification) => void;
}

/**
 * The contract every remote must satisfy.
 * Shell calls mount/unmount; no token or user object is passed.
 */
export interface RemoteModule {
  mount(el: HTMLElement, ctx: RemoteMountContext): void | Promise<void>;
  unmount(): void | Promise<void>;
}

/**
 * Shape returned by GET /api/v1/mfe-configs/accessible.
 */
export interface MfeAccessibleItem extends MfeRemoteRef {
  id: string;
  routeName: string;
  title: string;
  framework: 'react' | 'vue' | 'angular';
  /** Optional HTTPS launcher icon. Omitted when unset. */
  iconUrl?: string;
}

/**
 * Scope-filtered tree node from
 * GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible.
 * Scopes are omitted. `path` is present on `type: 'route'` only.
 */
export interface MfeNavNode {
  id: string;
  type: 'group' | 'route';
  title: string;
  path?: string;
  iconUrl?: string;
  children: MfeNavNode[];
}

/** Shape of the auth endpoints' success body. */
export interface AuthResponse {
  userId: string;
  accessToken: string;
  tokenExpires: number;
}

export interface RegisterResponse {
  userId: string;
}
