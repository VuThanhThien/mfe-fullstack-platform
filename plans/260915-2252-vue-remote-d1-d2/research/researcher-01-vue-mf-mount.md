# Researcher 01 — Vue MF mount (`@module-federation/vite@1.16.6`)

**Date:** 2026-09-15  
**Note:** Auto-researcher agent hit model limit; synthesized from platform patterns + MF 2.0 contract.

## Target contract

Same as React remotes: expose `{ mount(el, ctx), unmount() }`. Shell calls `loadRemote` → `mount` — **never imports `vue`**.

## Recommended vite remote config (sketch)

```ts
federation({
  name: 'demoVue',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/exposes/app.ts' },
  manifest: true,
  dts: true,
  dev: { remoteHmr: false }, // match React remotes
  shared: {
    vue: { singleton: true, requiredVersion: '^3.5.0' },
    'vue-router': { singleton: true, requiredVersion: '^4.2.0' },
    pinia: { singleton: true, requiredVersion: '^3.0.0' },
    '@mfe/sdk': { singleton: true, requiredVersion: '^0.1.0' },
  },
})
```

- `base: command === 'build' ? '/r/demo-vue/' : '/'`
- Pin `@module-federation/vite@1.16.6`; dep `@module-federation/enhanced` like other remotes
- Prefer `mf-manifest.json` as `remoteEntry` in seed (SDK `toRuntimeEntry`)

## Mount / unmount pattern

```ts
import { createApp, type App } from 'vue';
import type { RemoteMountContext } from '@mfe/sdk';

let app: App<Element> | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  if (app) unmount();
  app = createApp(/* root */, { /* provide ctx */ });
  app.use(pinia).use(routerEmbedded);
  app.mount(el);
}

export function unmount(): void {
  app?.unmount();
  app = null;
}
```

- One module-level `app` per expose file (single `./App` this phase).
- Hosted router: `createMemoryHistory` (spec lock).
- Idempotent unmount required (React StrictMode / fast nav).

## Shared / host pitfalls

| Issue | Guidance |
|-------|----------|
| Shell does not declare `vue` shared | OK for one Vue remote — Vue ships with remote; singleton still declared on remote for future |
| Duplicate Vue if mis-shared | Avoid shell importing vue; do not add vue to shell shared until 2nd Vue remote |
| CSS / Tailwind preflight vs MUI | Scope dark class on mount `el`; accept residual global risk |
| `remoteHmr: true` | Avoid — same React remote breakage risk |
| axios | Never share; only via `@mfe/sdk` |

## Pinia / vue-router shared with one remote

Still mark singleton shared — cheap, prepares multi-Vue; no host consumer required.
