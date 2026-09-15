/**
 * Remote loader — registers MFE remotes and loads them via Module Federation 2 runtime.
 *
 * IMPORTANT: Shell uses `@module-federation/vite` which already creates the **default**
 * MF host instance. We must use the top-level runtime APIs (registerRemotes / loadRemote)
 * — NOT createInstance() — or we get an isolated instance that loads ESM remoteEntry as a
 * classic <script> and throws RUNTIME-008.
 *
 * Spec / research: plans/.../researcher-01-module-federation-vite.md
 */

import type { MfeRemoteRef, RemoteModule } from './types.js';

type MfRuntime = {
  registerRemotes: (
    remotes: Array<{ name: string; entry: string; type?: string }>,
    opts?: { force?: boolean },
  ) => void;
  loadRemote: (id: string) => Promise<unknown>;
};

/** Optional peer — shell/remotes install it; landing must typecheck without it. */
const MF_RUNTIME = '@module-federation/enhanced/runtime';

let _runtime: MfRuntime | null = null;

async function getRuntime(): Promise<MfRuntime> {
  if (_runtime) return _runtime;

  // Dynamic string import → Promise<any>; no ambient module / peer install required.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mf: any = await import(/* @vite-ignore */ MF_RUNTIME);

  // Prefer top-level APIs bound to the host build-plugin instance.
  if (typeof mf.registerRemotes === 'function' && typeof mf.loadRemote === 'function') {
    _runtime = {
      registerRemotes: mf.registerRemotes.bind(mf),
      loadRemote: mf.loadRemote.bind(mf),
    };
    return _runtime;
  }

  // Fallback for tests / pure-runtime (no host plugin): createInstance.
  const createInstance = mf.createInstance ?? mf.default?.createInstance;
  if (typeof createInstance !== 'function') {
    throw new Error('@module-federation/enhanced/runtime: no registerRemotes/loadRemote/createInstance');
  }
  const instance = createInstance({ name: 'mfe-sdk-runtime', remotes: [] });
  _runtime = {
    registerRemotes: instance.registerRemotes.bind(instance),
    loadRemote: instance.loadRemote.bind(instance),
  };
  return _runtime;
}

/**
 * Prefer mf-manifest.json — carries `metaData.remoteEntry.type: "module"`.
 */
export function toRuntimeEntry(remoteEntry: string): string {
  if (/\/remoteEntry\.js(\?.*)?$/i.test(remoteEntry)) {
    return remoteEntry.replace(/\/remoteEntry\.js(\?.*)?$/i, '/mf-manifest.json$1');
  }
  return remoteEntry;
}

function toRuntimeRemote(c: MfeRemoteRef) {
  return {
    name: c.remoteName,
    entry: toRuntimeEntry(c.remoteEntry),
    type: 'module' as const,
  };
}

/**
 * Register remotes on the host MF instance (`force` overwrites stale classic-script regs).
 */
export async function registerRemotes(cfgs: MfeRemoteRef[]): Promise<void> {
  const runtime = await getRuntime();
  runtime.registerRemotes(cfgs.map(toRuntimeRemote), { force: true });
}

/**
 * Load a remote module and validate the { mount, unmount } contract.
 */
export async function loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule> {
  const runtime = await getRuntime();

  runtime.registerRemotes([toRuntimeRemote(cfg)], { force: true });

  const moduleId = `${cfg.remoteName}/${cfg.exposedModule.replace(/^\.\//, '')}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await runtime.loadRemote(moduleId)) as any;

  if (typeof mod?.mount !== 'function' || typeof mod?.unmount !== 'function') {
    throw new Error(
      `Remote "${cfg.remoteName}${cfg.exposedModule}" must export { mount, unmount }. Got: ${Object.keys(mod ?? {}).join(', ') || '(nothing)'}`,
    );
  }

  return mod as RemoteModule;
}
