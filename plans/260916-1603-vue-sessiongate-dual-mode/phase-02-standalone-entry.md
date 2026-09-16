# Phase 02 — StandaloneRoot + main.ts

**Status:** Done  
**Effort:** 2h  
**Priority:** P1  
**Depends on:** Phase 01  
**Spec:** `docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md` §4–§6  
**Refs:** `remotes/demo-react/src/main.tsx`; `remotes/demo-vue/src/exposes/app.ts` (`mountStandalone`, `unmount`)

## Goal

Replace Mode C redirect stub with dual-mode standalone entry: SessionGate → local LoginForm → `mountStandalone`.

## Requirements

- `setRedirectPolicy('standalone')`
- `setRedirect` → parse `next` → `window.location.assign(safeStandalonePath(next, '/'))` (same comment as demo-react: do not map to `/?next=`)
- Remove `VITE_PUBLIC_LOGIN_URL` redirect happy path
- On ready: call `mountStandalone` **once** on a dedicated host element; on teardown / leave ready: `unmount()`
- Login: `login(values)` then `retry()`; map errors via `resolveLoginError`
- Unreachable: banner + Retry button
- **Do not** modify `exposes/app.ts` mount contract or embedded router mode

## Files

| Action | Path |
|--------|------|
| Create | `remotes/demo-vue/src/StandaloneRoot.vue` |
| Modify | `remotes/demo-vue/src/main.ts` |
| Optional | delete unused env mentions only in code; README in P3 |

**Must not touch:** `exposes/app.ts` logic (unless a tiny export comment update), router `embedded` history, shell

## Architecture notes

Preferred mount pattern:

```
#app
  SessionGate
    login slot → form
    default → <div ref="host">  // mountStandalone(host, { basePath:'/', routeName:'vue' })
```

- Watch `ready` / use `onMounted` on host ref; guard with `mounted` flag.
- Before remount: `unmount()` from expose (idempotent).

## Steps

1. Create `StandaloneRoot.vue` wiring SessionGate + LoginForm + host div.
2. Rewrite `main.ts` to `createApp(StandaloneRoot).mount('#app')` + redirect policy.
3. Manual: unauth `:5177` shows form; login works with backend + Vite `/api` proxy.
4. `pnpm typecheck` + `pnpm build`.

## Acceptance

- [x] No redirect to `:8080/login` on unauth boot (Mode C removed from `main.ts`)
- [x] Successful login mounts dashboard (`RemoteHost` → `mountStandalone`)
- [x] Mid-session redirect policy uses `safeStandalonePath`
- [x] Hosted path untouched (no gate on `mount`)
- [x] typecheck + build green

## Risks

- Double-createApp if mountStandalone also assumes empty el — expose already `createApp` into `el`; host div must be empty and only used for remote root.
- HMR double mount — rely on expose `unmount` before boot.
