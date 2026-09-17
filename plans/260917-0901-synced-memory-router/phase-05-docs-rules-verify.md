# Phase 05 — Docs rules + verify

**Priority:** P1  
**Status:** Complete  
**Effort:** 2h  
**Owns:** `docs/**` (standards + summary/arch touch), package READMEs, plan checkboxes  
**Blocked by:** P2, P3, P4

## Overview

Codify routing contract in standards + each app README. Verify builds/tests/e2e. Mark plan complete.

## Requirements — rule text (MUST land)

**Hosted React remotes:**

- **MUST** use `SyncedMemoryRouter` from `@mfe/sdk/react-router` (MemoryRouter + window sync via `location-sync`).
- **MUST NOT** nest `BrowserRouter` under the shell host.
- Standalone React remotes: same component with `basePath="/"` (not a second BrowserRouter unless app is not shell-hosted — landing only).

**Shell:** keeps `BrowserRouter basename="/app"` + `ShellHistorySync`.

**Landing:** keeps `BrowserRouter` (standalone app, not a federation remote).

**Vue hosted:** memory history; URL sync still deferred TODO (unchanged).

**SDK:** apps must not patch `history` themselves; use `subscribeLocationChange` / `runWithoutLocationNotify` / SyncedMemoryRouter.

## Related files

**Modify**

- `docs/code-standards-frontend.md` — new §2.3.x “Hosted remote routing” (or under §2.3.1 after mount lifecycle)
- `docs/code-standards-sdk.md` — structure + exports for `location-sync` + `@mfe/sdk/react-router`; peers note
- `docs/system-architecture.md` — short paragraph on history bus + Memory sync
- `docs/codebase-summary.md` — inventory line if routing files listed
- `packages/mfe-sdk/README.md` — if P1 left gaps
- `shell/README.md` — ShellHistorySync + remote contract pointer
- `remotes/demo-react/README.md` — SyncedMemoryRouter rule
- `remotes/admin-react/README.md` — same; remove any BrowserRouter guidance
- `remotes/demo-vue/README.md` — explicit: React rule N/A; Vue sync TODO
- `CLAUDE.md` — only if Common Questions / architecture guarantees need one line
- This plan’s phase todos + `plan.md` frontmatter → completed when verify green

**Must not:** edit historical brainstorm specs except linking; rewrite unrelated standards.

## Implementation steps

1. [x] Write § Hosted remote routing in frontend standards (MUST / MUST NOT table).
2. [x] Update SDK standards structure tree + exports list + optional peers.
3. [x] Per-repo README bullets (shell, demo-react, admin-react, demo-vue, mfe-sdk).
4. [x] Light architecture/summary sync.
5. [x] Verify:
   - [x] `cd packages/mfe-sdk && pnpm test && pnpm typecheck` — **60 tests green**
   - [x] demo-react / admin-react / shell typecheck (+ build if CI expects)
   - [ ] `node scripts/e2e-shell-nav-click.mjs` (stack up) — **skipped:** Puppeteer could not launch Chrome in verify env (install browser or `PUPPETEER_EXECUTABLE_PATH`)
   - [ ] Manual: admin shell-nav subpath without refresh — **same e2e gap**
6. [x] Mark phases complete; set `plan.md` status `completed`.

## Success criteria

- [x] Junior reading standards knows: remote React → SyncedMemoryRouter; shell/landing → BrowserRouter OK
- [x] Admin BrowserRouter gone from code + docs
- [x] Verify commands green *(unit + typecheck only; e2e env-blocked — see step 5)*
- [x] Plan checkboxes updated

## Next

Cook done → optional follow-up plan for Vue URL sync.
