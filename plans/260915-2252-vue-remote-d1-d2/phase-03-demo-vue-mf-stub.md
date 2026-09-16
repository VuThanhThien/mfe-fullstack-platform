# Phase 03 — demo-vue MF stub

## Context Links

- Spec §4 deployable layout, §5 hosted
- Research 01 mount pattern
- Mirror `remotes/admin-react` Dockerfile / vite federation (Vue instead of React)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 3h
- **Risk:** high — first Vue + MF 2.0 in repo
- **Parallel:** Wave 0 with P1, P2

Scaffold `remotes/demo-vue` with working `{ mount, unmount }` stub (hello text). Prove manifest + shell load before UI port (P5).

## Requirements

- Package: pnpm, Vue 3.5, Vite 5, `@vitejs/plugin-vue`, `@module-federation/vite@1.16.6`
- `file:../../packages/mfe-sdk` (+ install SDK prod in Docker like other remotes)
- **No** `@mfe/ui` dependency
- Expose `./App` → `src/exposes/app.ts`
- Stub UI: mount shows “Vue remote stub” + optional `routeName` from ctx
- `shared`: vue, vue-router, pinia, `@mfe/sdk` singletons (pinia/router ok even if stub unused)
- `remoteHmr: false`
- `base`: `/` dev, `/r/demo-vue/` build
- Port **5177**; Dockerfile multi-stage + `Caddyfile.static`
- README: dev commands
- typecheck + build green

## Related Code Files

**Create**
- `remotes/demo-vue/**` (package.json, vite.config.ts, tsconfig*, index.html, src/*, Dockerfile, Caddyfile.static, README)

**Do not**
- Port full dashboard yet (P5)
- Shell / seeder / gateway (other phases)

## Implementation Steps

1. Scaffold Vite Vue TS app under `remotes/demo-vue`.
2. Add federation plugin config (`name: 'demoVue'`).
3. Implement `exposes/app.ts` createApp mount/unmount (module-level app).
4. Minimal `main.ts` can mount stub for local peek (redirect polish = P6).
5. Dockerfile: copy SDK, `pnpm install --prod` in SDK, install remote, build, Caddy — **skip mfe-ui copy**.
6. `pnpm build` → confirm `dist/mf-manifest.json`.
7. Manual: gateway (P2) + `loadRemote` via shell once P4 ready — or temporary console test.

## Todo

- [x] package + vite federation
- [x] expose mount/unmount
- [x] Dockerfile + static Caddy
- [x] typecheck + build
- [x] README stub

## Success Criteria

- [x] `pnpm build` emits mf-manifest under `/r/demo-vue/` base
- [x] Manifest reachable via gateway after P2
- [x] Mount/unmount idempotent (double mount safe)

## Risks

| Risk | Mitigation |
|------|------------|
| RUNTIME-008 / wrong remoteEntry type | Use mf-manifest.json in seed; `type: 'module'` |
| Vue shared mismatch | Pin vue ^3.5; singleton true |
| Docker axios resolve | Install SDK prod deps in place |

## Security

- No tokens in stub; mount ctx only.

## Next Steps

P4 shell branch; P5 replaces stub content (same ownership — wait for P3 done).
