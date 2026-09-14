# Phase 2 — Shell layout rewrite

## Context Links

- Spec §4–§5 (chrome ownership option 4)
- Current: `shell/src/layout/ShellLayout.tsx`
- Package API from P1: `AppHeader`, `NavDrawer`, `AppFooter`, widths
- Plan: `plans/260915-0001-dashboard-layout-widgets/plan.md`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 3h
- **Risk:** medium — must preserve logout, theme toggle, snackbar, accessibles nav, e2e testids

Replace hand-rolled AppBar/Drawer markup with `@mfe/ui` layout primitives. Add footer. Keep behavior: accessibles → nav, `data-testid="theme-mode-toggle"`, NotifyContext snackbar.

## Key Insights

- Import from `@mfe/ui` only — **never** `@mfe/ui/widgets`.
- Drawer items: map `accessibles` to `{ key, label, href|to, selected }`; use RR `Link` via MUI `component` prop.
- Reference `AdminAppBar` offset-by-drawer — reproduce spacing with existing Toolbar spacer pattern or layout props; do not copy SettingsDrawer.
- Collapse: optional; fixed `drawerWidth` from package constants is enough for v1.
- Drawer/mobile UI state: **in-memory only** (`useBoolean`) — no new `localStorage` keys.
- Nav: RR `Link` + relative `to` from `routeName` only (never map `remoteEntry` into `href`).
- Admin remote needs **zero** code changes to inherit chrome.

## Requirements

- Visual: polished header + sidebar + footer on all `/app/*` routes.
- Functional: theme toggle, logout, mobile drawer, empty accessibles empty-state, snackbar unchanged.
- Preserve e2e selectors used by `scripts/e2e-demo-remote.mjs` (theme toggle testid).

## Related Code Files

**Modify**

- `shell/src/layout/ShellLayout.tsx` — compose layout kit
- `shell/package.json` / lock — only if new peer install needed (icons already present)
- `shell/Dockerfile` — only if install steps change (unlikely)

**Must not touch:** `packages/mfe-ui/**`, remotes, compose, docs

## Implementation Steps

1. Import `AppHeader`, `NavDrawer`, `AppFooter`, width constants from `@mfe/ui`.
2. Build `navItems` from `accessibles` (title, routeName, selected vs `useParams`).
3. Move theme toggle + logout into `AppHeader` children/actions slot.
4. Wire mobile open/close to `NavDrawer` props (existing `useBoolean`).
5. Add `AppFooter` with product name (“MFE Platform”) + short line.
6. Ensure main content area padding works with remote outlet (no maxWidth here).
7. `pnpm typecheck` + `pnpm build` in shell.
8. Manual: login → drawer lists remotes; open demo + admin; footer visible; no double chrome.

## Todo List

- [x] Rewrite ShellLayout onto layout kit
- [x] Footer + preserve theme/logout/snackbar/testids
- [x] typecheck + build green
- [x] Smoke: demo + admin under new chrome

## Success Criteria

- [x] No import of `@mfe/ui/widgets` in shell (grep)
- [x] Accessibles-driven nav still works
- [x] Theme toggle still flips mode for remotes

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Break e2e testid | Keep `data-testid="theme-mode-toggle"` |
| Drawer link paths wrong | Keep existing `to`/`basename` behavior that works today |

## Security Considerations

- Logout still clears session via SDK; no new storage.

## Next Steps

→ Unblocks parallel completion with P3; P4 verifies e2e.
