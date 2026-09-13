/**
 * A reference to a micro-frontend remote and the module it exposes.
 */
export interface MfeRemoteRef {
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
}

/**
 * The contract every remote must satisfy.
 * Shell calls mount/unmount; no token or user object is passed.
 */
export interface RemoteModule {
  mount(
    el: HTMLElement,
    ctx: { basePath: string; routeName: string },
  ): void | Promise<void>;
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
