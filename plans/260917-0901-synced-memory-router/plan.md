---
title: "Synced Memory Router (canonical hosted React routing)"
description: "Move SyncedMemoryRouter into @mfe/sdk, migrate admin off nested BrowserRouter, harden location-sync, document MUST rules."
status: completed
priority: P1
effort: 8h
branch: master
tags: [refactor, frontend, sdk, mfe, tech-debt]
created: 2026-09-17
spec: docs/brainstorm/2026-09-17-synced-memory-router-location-sync.md
---

# Synced Memory Router

**Spec:** [`docs/brainstorm/2026-09-17-synced-memory-router-location-sync.md`](../../docs/brainstorm/2026-09-17-synced-memory-router-location-sync.md)  
**Mode:** `--parallel`  
**Scout:** [`reports/scout-report.md`](./reports/scout-report.md) · **Brainstorm:** [`reports/brainstorm-summary.md`](./reports/brainstorm-summary.md) · **Audit:** [`reports/audit-lightweight.md`](./reports/audit-lightweight.md)

## Goal

1. One hosted React routing contract: **MemoryRouter ↔ window** via `@mfe/sdk` `SyncedMemoryRouter`.
2. Admin remote drops nested `BrowserRouter` (fix shell-nav drift).
3. Harden `location-sync` + shell sync (stability / no throttle storms).
4. Update standards + per-app READMEs: hosted React **MUST** use SyncedMemoryRouter; **MUST NOT** nest BrowserRouter under shell.

## Problem

Three hosted router strategies. Admin nested BrowserRouter can diverge from address bar when shell NavTree navigates within same `routeName` (outlet does not remount). Sync helpers live only in demo-react.

## Decisions (locked)

| # | Choice |
|---|--------|
| 1 | Approach A — Memory + bidirectional sync |
| 2 | Component in `@mfe/sdk` via subpath `@mfe/sdk/react-router` (main barrel stays React-free) |
| 3 | Optional peers: `react`, `react-dom`, `react-router-dom` |
| 4 | Shell / landing keep BrowserRouter |
| 5 | Vue URL sync **out of scope** |
| 6 | No shell-owned deep router / event bus |

## Constraints

1. axios only in SDK; apps use `api.*`.
2. Do not bump `@module-federation/vite`.
3. Mount contract unchanged `{ basePath, routeName, locale?, onNotify? }`.
4. Preserve e2e `scripts/e2e-shell-nav-click.mjs` (no navigation throttling).
5. YAGNI — no Navigation API rewrite this plan.

## Execution strategy (parallel)

```
P1 SDK ──► P2 demo-react ─┬─► P5 docs/verify
           P3 admin ──────┤
           P4 shell ──────┘
```

- **Wave A:** P1 only  
- **Wave B:** P2 ∥ P3 ∥ P4 (after P1 export stable)  
- **Wave C:** P5

## File ownership

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `packages/mfe-sdk/**` | remotes, shell UI, docs authority (README ok) |
| 2 | `remotes/demo-react/**` | admin, shell, sdk impl |
| 3 | `remotes/admin-react/**` | demo-react, shell, sdk impl |
| 4 | `shell/src/routing/**`, `shell/src/nav/use-shell-pathname.ts` (+ App import only if needed) | remotes, sdk impl beyond consume |
| 5 | `docs/**` (not rewriting locked brainstorms except new link), package READMEs, CLAUDE.md iff routing mentioned | feature code except verify fixes |

Conflict rule: pathname helpers exported from SDK in **P1**; shell consumes in **P4**; remotes only import `SyncedMemoryRouter` in P2/P3.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | SDK SyncedMemoryRouter + harden location-sync | Complete | 3h | [phase-01](./phase-01-sdk-synced-memory-router.md) |
| 2 | demo-react consume SDK | Complete | 0.5h | [phase-02](./phase-02-demo-react-consume.md) |
| 3 | admin migrate off BrowserRouter | Complete | 1.5h | [phase-03](./phase-03-admin-migrate.md) |
| 4 | shell harden sync | Complete | 1h | [phase-04](./phase-04-shell-harden.md) |
| 5 | Docs rules + verify | Complete | 2h | [phase-05](./phase-05-docs-rules-verify.md) |

## Success (roll-up)

- [x] `@mfe/sdk/react-router` exports `SyncedMemoryRouter`; location-sync tested (60 unit tests green)
- [x] demo-react deletes local copy; admin uses SDK SyncedMemoryRouter
- [ ] Shell nav between admin subpaths updates UI without refresh *(implementation shipped; not e2e-verified — see below)*
- [x] Standards + READMEs state MUST / MUST NOT routing rules
- [x] typecheck green: mfe-sdk, demo-react, admin-react, shell
- [ ] e2e `scripts/e2e-shell-nav-click.mjs` *(skipped: Puppeteer Chrome not installed in verify env)*

## Out of scope

Vue URL sync; shared History object; remount-on-subpath; Navigation API primary bus; landing router changes.
