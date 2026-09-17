# Scout Report — Synced Memory Router

**Date:** 2026-09-17  
**Scope:** shell / SDK / remotes routing + location sync

## Relevant files

| Path | Role |
|------|------|
| `packages/mfe-sdk/src/location-sync.ts` | Single history patch + subscribe + depth guard |
| `packages/mfe-sdk/src/index.ts` | Exports location-sync helpers |
| `shell/src/App.tsx` | BrowserRouter basename=/app + ShellHistorySync |
| `shell/src/routing/ShellHistorySync.tsx` | window → shell navigate(replace) |
| `shell/src/nav/use-shell-pathname.ts` | window-first pathname for nav active |
| `shell/src/pages/RemoteOutlet.tsx` | mount `basePath=/app/{routeName}`; remount on routeName only |
| `remotes/demo-react/src/routing/SyncedMemoryRouter.tsx` | Memory ↔ window (canonical impl today) |
| `remotes/demo-react/src/ProductApp.tsx` | Uses SyncedMemoryRouter |
| `remotes/admin-react/src/AdminApp.tsx` | nested BrowserRouter — migrate |
| `remotes/demo-vue/src/router/index.ts` | hosted memory; no sync (OOS) |
| `scripts/e2e-shell-nav-click.mjs` | Regression for throttling storms |

## Patterns

- SDK patches history once; remotes must not re-wrap.
- Same-URL push/replace → no notify (RR replaceState loops).
- demo-react: Memory→pushState; Window→navigate inside `runWithoutLocationNotify`.
- admin: RR owns URL directly; missing subscribe for shell-driven pushState.

## Risks found

1. Admin drift when shell NavTree changes subpath (same routeName, no remount).
2. SDK has no react peers / no jsx / vitest `node` — moving SyncedMemoryRouter needs peers + tsx + jsdom for component tests.
3. Duplicate `BASENAME='/app'` in shell sync + pathname hook.
4. Vue hosted deep links ignore bar (known TODO).

## Docs gap

No standards section “hosted React remotes MUST SyncedMemoryRouter”. Admin brainstorm historically allowed nested BrowserRouter — supersede for hosted React.
