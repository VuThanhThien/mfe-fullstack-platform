/**
 * Remote loader — registers MFE remotes and loads them via Module Federation 2 runtime.
 *
 * IMPORTANT: Shell uses `@module-federation/vite` which already creates the **default**
 * MF host instance. We must use the top-level runtime APIs (registerRemotes / loadRemote)
 * — NOT createInstance() — or we get an isolated instance that loads ESM remoteEntry as a
 * classic <script> and throws RUNTIME-008.
 *
 * Spec / research: plans/.../researcher-01-module-federation-vite.md
 *
 * Browser note: bare `import('@module-federation/enhanced/runtime')` does **not** resolve
 * inside the federation shared `@mfe/sdk` chunk (`@vite-ignore` left a bare specifier).
 * Hosts that call `registerRemotes` / `loadRemote` must `setMfRuntime(...)` once at boot
 * (shell `main.tsx`) with a statically-bundled import. Unit tests inject a mock the same way.
 */

import type { MfeRemoteRef, RemoteModule } from './types.js';

export type MfRuntime = {
  registerRemotes: (
    remotes: Array<{ name: string; entry: string; type?: string }>,
    opts?: { force?: boolean },
  ) => void;
  loadRemote: (id: string) => Promise<unknown>;
};

let _runtime: MfRuntime | null = null;

/**
 * Inject the host MF runtime (required in the browser before registerRemotes/loadRemote).
 * Idempotent — later calls overwrite (useful in tests).
 */
export function setMfRuntime(runtime: MfRuntime): void {
  _runtime = runtime;
}

/** Test helper — clears the injected runtime. */
export function clearMfRuntime(): void {
  _runtime = null;
}

function getRuntime(): MfRuntime {
  if (!_runtime) {
    throw new Error(
      '@mfe/sdk: MF runtime not set. Call setMfRuntime() from the host entry (e.g. shell main.tsx) before registerRemotes/loadRemote.',
    );
  }
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
 * Dedupes by `remoteName` — multiple MfeConfigs may share one remote bundle.
 */
export async function registerRemotes(cfgs: MfeRemoteRef[]): Promise<void> {
  const runtime = getRuntime();
  const byName = new Map<string, ReturnType<typeof toRuntimeRemote>>();
  for (const c of cfgs) {
    byName.set(c.remoteName, toRuntimeRemote(c));
  }
  runtime.registerRemotes([...byName.values()], { force: true });
}

/**
 * Load a remote module and validate the { mount, unmount } contract.
 */
export async function loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule> {
  const runtime = getRuntime();

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
