---
title: "App Launcher + Nested Nav Tree"
description: "Shell Home/Apps launcher + API-managed per-MfeConfig nested sidebar with scope-gated admin CRUD."
status: completed
priority: P1
effort: 26h
branch: master
tags: [feature, frontend, backend, api, auth, mfe]
created: 2026-09-16
spec: docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md
---

# App Launcher + Nested Nav Tree

**Spec (approved):** [`docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`](../../docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md)  
**Mode:** `--parallel`  
**Scout:** [`reports/scout-report.md`](./reports/scout-report.md)

## Goal

1. `/app` Home + header Apps grid = accessible `MfeConfig` widgets (`iconUrl`).
2. Inside `/app/:routeName`, shell drawer = lazy nested nav from API (not flat config list).
3. ADMIN CRUD nested `group`|`route` nodes + per-node scopes via admin remote.
4. Mount contract unchanged; scope-only; nav ≠ ACL.

## Problem

Shell drawer = flat `accessible` list. Portal needs app launcher + per-app nested menus managed centrally.

## Decisions (locked — from spec)

| # | Choice |
|---|--------|
| 1 | Shell owns sidebar |
| 2 | Scope-only; per-node scopes; ≥1 scope per node |
| 3 | 1 MfeConfig = 1 widget = 1 tree |
| 4 | Home + header Apps |
| 5 | `group` \| `route`; relative path |
| 6 | HTTPS `iconUrl` |
| 7 | Lazy `GET .../nav/accessible` |
| 8 | Entity + join table (not JSON blob) |
| 9 | 404 if config not accessible |
| 10 | Empty scopes on write forbidden |

## Constraints

1. No RBAC / MinIO / external nav leaves / cross-remote sidebar links.
2. axios only in `@mfe/sdk`; apps use `api.*`.
3. No tokens in storage; no `?token=`.
4. Remotes must not add second full chrome.
5. Migration hand-written SQL; `synchronize: false`.
6. Pin `@module-federation/vite@1.16.6` — do not bump.

## Execution strategy (parallel)

```
P1 backend ──┬──► P2 SDK ──────────► P3 shell ──► P5 docs/verify
             └──► P4 admin ─────────────────────►┘
```

- **Wave A:** P1 only  
- **Wave B:** P2 ∥ P4 (after P1 API stable)  
- **Wave C:** P3 (needs SDK types)  
- **Wave D:** P5

## File ownership

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `backend/src/api/mfe-config/**`, `backend/src/api/mfe-nav/**` (or nested under mfe-config), migrations, seeds | shell, admin UI, sdk |
| 2 | `packages/mfe-sdk/**` | backend, shell UI, admin |
| 3 | `shell/src/**` | backend, admin, sdk (except consume) |
| 4 | `remotes/admin-react/**` | shell, backend impl, sdk |
| 5 | `docs/**` (not brainstorm historical edits beyond linking), READMEs, plan checkboxes | feature code except verify fixes |

Conflict rule: `MfeConfig` DTO `iconUrl` lands in **P1**; SDK mirrors in **P2**; admin form field in **P4**; shell render in **P3**.

## Phases

**Progress:** 23/23 phase todos (100%). All phases complete.

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Backend nav entity + API | Complete | 9h | [phase-01](./phase-01-backend-nav-api.md) |
| 2 | SDK types | Complete | 2h | [phase-02-sdk-types.md](./phase-02-sdk-types.md) |
| 3 | Shell launcher + drawer | Complete | 7h | [phase-03-shell-launcher-drawer.md](./phase-03-shell-launcher-drawer.md) |
| 4 | Admin nav CRUD UI | Complete | 6h | [phase-04-admin-nav-ui.md](./phase-04-admin-nav-ui.md) |
| 5 | Docs + verify | Complete | 2h | [phase-05-docs-verify.md](./phase-05-docs-verify.md) |

## Success (roll-up)

- [x] Launcher Home + Apps; drawer nested from API
- [x] ADMIN tree CRUD + scopes + iconUrl
- [x] Filter/hide + 404 rules covered by tests
- [x] migrate+seed demo trees
- [x] typecheck/build green for touched packages

## Out of scope

RBAC; MinIO; drag-drop polish beyond up/down; Vue admin; changing remote mount; URL-synced Vue router.

## Audit notes (self)

- Route ordering risk on controller — call out in P1.
- Deep-link ≠ ACL — document in P3/P5; do not “fix” by shell redirect.
- Researcher agent unavailable (model limit); adjacency-list choice validated via scout + common practice.
