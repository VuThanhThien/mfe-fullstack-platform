# Synced Memory Router + Location Sync (technical brainstorm)

**Date:** 2026-09-17  
**Status:** Approved direction → plan `plans/260917-0901-synced-memory-router/`  
**Authority after ship:** running code > this note

## Problem

Shell `BrowserRouter basename=/app` + remotes with own routers share one `window.history`. Remotes that `pushState` do not emit `popstate`, so shell RR + nav lag unless patched. Three hosted patterns today:

| Remote | Pattern | Gap |
|--------|---------|-----|
| demo-react | MemoryRouter + local SyncedMemoryRouter | Works; not shared |
| admin-react | nested BrowserRouter | Shell nav URL change can leave admin UI stale (no window→router) |
| demo-vue | memory history | No URL sync (deferred) |

Also: SDK `location-sync` undocumented/untested; `BASENAME` duplicated; storm risk if guards drift.

## Approaches evaluated

### A — Canonical Memory + sync (chosen)
- One React hosted pattern: MemoryRouter ↔ window via shared helper
- Helper lives in `@mfe/sdk` (user lock)
- Admin migrates off nested BrowserRouter
- Vue URL sync out of this plan

### B — Nested BrowserRouter everywhere + window→navigate listener
- Less move of Memory pattern; still two BrowserRouters on one history
- Harder to reason; storm risk remains

### C — Shared history / shell-owned deep router
- Rejected: breaks locked non-goal (shell does not replace per-remote routers); Vue/React history APIs diverge

## Decisions (locked)

1. **A** — Memory + bidirectional sync is the React hosted contract.
2. **`SyncedMemoryRouter` in `@mfe/sdk`** — prefer subpath `@mfe/sdk/react-router` so main barrel stays React-free for Vue.
3. **Shell** keeps `BrowserRouter`; **landing** keeps `BrowserRouter` (not a remote).
4. **Do not nest `BrowserRouter` under shell** for React remotes (hosted or standalone with `basePath="/"` use SyncedMemoryRouter).
5. **Vue URL sync** remains deferred TODO.
6. Harden `location-sync` + `ShellHistorySync` (`runWithoutLocationNotify`, tests, shared basename helper optional).

## Success metrics

- Shell drawer leaf click updates mounted admin/product view without remount/refresh
- No navigation throttling storms (`e2e-shell-nav-click.mjs`)
- Deep link + back/forward work for React remotes under `/app/{routeName}/*`
- Docs/READMEs state the MUST rule for hosted React remotes

## Non-goals

Shell-owned remote router; event bus; Navigation API as sole bus; Vue sync; remount remote on every subpath.
