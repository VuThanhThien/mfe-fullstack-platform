# Phase 03 — Shell launcher + drawer

**Priority:** P1  
**Status:** Complete  
**Effort:** 7h  
**Owns:** `shell/src/`  
**Blocked by:** P2

## Overview

Replace flat accessible drawer with: Home launcher grid, header Apps popover, per-route nested NavDrawer fed by lazy nav API + memory cache.

## Key insights

- `basename="/app"` → Home = index route; links use `/{routeName}`.
- Drawer content today in `ShellLayout` — split Home page vs layout chrome.
- Do not put nav into `mount()` context.
- On `/app` index: hide app drawer or show empty (“Select an app”).

## Requirements

- Home grid from `accessibles` + `iconUrl` / fallback avatar.
- Header Apps → same grid; navigate on select; close popover.
- When `routeName` set: fetch nav; render nested MUI List (collapse groups); leaf `Link` to `/{routeName}/{path}`.
- Cache per `routeName`; invalidate on `refreshAccessibles`.
- Error + Retry in drawer; empty tree message.
- Active leaf = longest path prefix match.

## Related files

**Create**

- `shell/src/pages/HomeLauncher.tsx` (or `layout/AppLauncherGrid.tsx` shared)
- `shell/src/context/NavContext.tsx` (fetch + cache) — or hooks under `shell/src/nav/`
- `shell/src/layout/NavTree.tsx`

**Modify**

- `shell/src/App.tsx` — index route → HomeLauncher
- `shell/src/layout/ShellLayout.tsx` — Apps control; conditional drawer; stop flat map
- `shell/src/auth/Gate.tsx` — only if context wiring needs it (prefer keep Gate thin)

**Must not:** edit remotes; edit backend; import axios.

## Implementation steps

1. Extract reusable `AppLauncherGrid` (props: items, onSelect).
2. Home page at `/` under ShellLayout.
3. Header IconButton + Popover/Menu with grid.
4. `useAppNav(routeName)` — lazy GET, cache, loading/error.
5. `NavTree` recursive groups; mobile drawer still closes on navigate.
6. Manual smoke: login → home → open product → sidebar; Apps switch to admin.

## Todo

- [x] HomeLauncher route
- [x] Header Apps popover
- [x] NavContext/hook + NavTree
- [x] ShellLayout wired; flat list removed
- [x] typecheck + build shell

## Success criteria

- No flat config list as primary sidebar inside an app.
- Deep-link still mounts remote; shell does not ACL-block by nav hide.

## Risks

| Risk | Mitigation |
|------|------------|
| Double fetch on strict mode | Cache + abort/ignore stale |
| Broken icon URL | `onError` → initial avatar |

## Next

## Implementation status

Shipped 2026-09-16. Home launcher grid, header Apps popover, lazy `NavContext` + nested `NavTree`; drawer hidden on `/app` index; flat accessible list removed from sidebar.

## Next

P5 verify with admin-created menus.
