---
title: "Cross-Remote State Sharing"
description: "Share context/state between shell and remotes via server state + URL, plus approved additive mount-context extension; fix/verify remote sub-route routing."
status: completed
priority: P1
effort: 7h
branch: master
tags: [feature, frontend, refactor, infra]
created: 2026-09-13
updated: 2026-09-14
spec: docs/brainstorm/2026-09-14-cross-remote-state-spec.md
---

# Cross-Remote State Sharing

**Spec (approved):** [`docs/brainstorm/2026-09-14-cross-remote-state-spec.md`](../../docs/brainstorm/2026-09-14-cross-remote-state-spec.md)  
**Refresh:** 2026-09-14 — brainstorm confirmed full P1–P5; `onNotify` does **not** trigger refetch; SDK store (option D) stays deferred. Do **not** regenerate duplicate phase folders.

## Goal

Let pages/remotes share context and state without breaking the locked remote contract. Deliver **server state** (`api.*` + refetch), **URL** query string, and one **approved** additive mount-context extension (`onNotify` / `locale`). Fix or verify remote sub-route routing.

## Problem statement (verified)

**(a) `accessible` is a boot-time snapshot.** `shell/src/auth/Gate.tsx` fetches inside a mount-only effect. When `admin-react` creates or edits an `MfeConfig`, the shell nav does **not** update until a full reload. Cache invalidation — not an event-bus problem.

**(b) Remote sub-routes / deep-link.** `shell/src/App.tsx` now has `path=":routeName/*"` (splat present in HEAD as of 2026-09-14). Phase 1 is **verify-first**: confirm hard refresh on `/app/admin/users` works; only edit if regression. Admin plan criterion still unticked until browser evidence.

**(c) List state is not shareable.** Admin list pages keep `page` in `useState` — refresh resets to page 1; links are not shareable.

**(d) Silent mutations.** No typed channel for remotes to surface success/error to shell UI without importing shell code.

## Decisions (locked)

| # | Decision | Consequence | When |
|---|----------|-------------|------|
| 1 | **Amend Guarantee #8** — optional `onNotify` / `locale` on mount ctx | P4 in scope; update `CLAUDE.md` + `system-architecture.md` same phase | 2026-09-13 |
| 2 | **Root `package.json`** + puppeteer (no `workspaces`) | P5; correct docs that assert "no root package.json" | 2026-09-13 |
| 3 | **URL state on all three lists** | P3: users + scopes + configs | 2026-09-13 |
| 4 | **Defer 8 broken fe-libs links to P5** | Repoint in docs-sync | 2026-09-13 |
| 5 | **Full plan scope** — verify P1 + implement P2–P5 | No MVP trim | 2026-09-14 |
| 6 | **`onNotify` ≠ refetch** — focus / `visibilitychange` only for `refreshAccessibles` | P2 triggers stay focus/visibility; P4 Snackbar only | 2026-09-14 |
| 7 | **Option D (SDK store) deferred** | Zustand/pinia-like store out of this plan | 2026-09-14 |

## Constraints (must not break)

1. **Guarantee #8** — amend additively only: no token, no user object, no event bus.
2. **Non-goal** — event bus / widget view; SDK reactive store.
3. **Token rules** — access memory-only; never localStorage/sessionStorage/cookie/URL.
4. **No remount** of live remote on refetch — `RemoteOutlet` deps stay string-based.
5. **`registerRemotes(..., { force: true })`** so new remotes appear after refetch.
6. Root `package.json` must **not** define `workspaces`.
7. **`onNotify` must not call `refreshAccessibles`** (decision 6).

## Approach (priority order)

| # | Mechanism | Contract change | Use for |
|---|-----------|-----------------|---------|
| A | Server state via `api.*` + refetch | No | Data one remote wrote, another reads |
| B | URL query string | No (needs splat verified) | Filters, paging — shareable + reload-safe |
| C | Additive mount ctx (`onNotify`, `locale`) | Yes — #8 amended | Mutation feedback → shell Snackbar |
| D | Narrow store inside `@mfe/sdk` | — | **Deferred** |

## Execution strategy

```
P1 verify splat (blocker) ──┬── P2 refetch accessible ──┐
                            └── P3 URL state (3 lists) ──┼── P5 verify + docs sync
P4 mount-ctx extension ─────────────────────────────────┘
```

- **P1 first** — verify (and fix only if needed); P3 worthless if deep-link 404s.
- **P2 ∥ P3** — independent file ownership; can parallel.
- **P4** — SDK contract + docs; single coherent change set; no refetch coupling.
- **P5 last** — evidence, root `package.json`, link hygiene.

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `shell/src/App.tsx` (only if splat missing/wrong) | remotes, SDK |
| 2 | `shell/src/context/RemoteContext.tsx`, `shell/src/auth/Gate.tsx` | remote source, SDK public API |
| 3 | `remotes/admin-react/src/pages/**`, `docs/code-standards-frontend.md` | shell source, SDK public API |
| 4 | `packages/mfe-sdk/src/types.ts`, `shell/src/pages/RemoteOutlet.tsx`, `shell/src/layout/ShellLayout.tsx`, `remotes/admin-react/src/expose.tsx` (+ mutation call sites), `CLAUDE.md`, `docs/system-architecture.md`, `docs/code-standards-frontend.md` | remote business logic beyond `onNotify` calls |
| 5 | root `package.json`, `scripts/**`, `plans/**`, `docs/**`, `README.md` | product code |

> Note: P3 and P4 both touch `code-standards-frontend.md` — P3 adds URL convention; P4 adds ctx-growth limit. If parallel, serialize the doc edit (P3 then P4, or one agent owns the satellite).

## Phases

| # | Phase | Effort | Output |
|---|-------|--------|--------|
| 1 | [Fix/verify remote routing (splat)](./phase-01-fix-remote-routing-splat.md) | 0.5h | Deep-link verified; splat present |
| 2 | [Refetch `accessible`](./phase-02-refetch-accessible.md) | 1.5h | `refreshAccessibles` + focus/visibility; no remount |
| 3 | [URL as shared state](./phase-03-url-as-shared-state.md) | 2.5h | `?page=` on all 3 lists + convention doc |
| 4 | [Mount-ctx extension](./phase-04-mount-context-extension.md) | 1.5h | `onNotify`/`locale`; #8 amended; no refetch |
| 5 | [Verify + sync docs](./phase-05-verify-and-sync-docs.md) | 1h | puppeteer root pkg; evidence; links consistent |

Total ≈ **7h**.

## Out of scope

- Event bus / pub-sub across remotes
- SDK state store / zustand / pinia (option D)
- `onNotify` → `refreshAccessibles`
- Token / user / scopes in mount ctx
- Shell-owned router replacing per-remote `BrowserRouter`
- Vue/Angular remotes
- pnpm workspace conversion

## Global success criteria

- [ ] **Deep-link `/app/admin/users` renders admin remote after refresh (no NotFound)** — Code ✓ (splat in place); Browser evidence UNVERIFIED (no Docker)
- [ ] **Admin creates/edits `MfeConfig` → shell nav updates without full reload (after focus or visibility)** — Code ✓ (focus/visibility triggers in Gate); Browser evidence UNVERIFIED
- [ ] **Refetch does not remount open remote or lose in-progress form input** — Code ✓ (string-based deps); Browser evidence UNVERIFIED
- [ ] **`?page=2` shareable + refresh + back/forward — users, scopes, and configs** — Code ✓ (all 3 lists use useSearchParams); Browser evidence UNVERIFIED
- [x] **Remote mutation → user-facing feedback via `onNotify` without importing shell code** — Code ✓ (admin-react calls onNotify)
- [x] **`onNotify` does not trigger `accessible` refetch (focus/visibility only)** — Code ✓ (onNotify isolated, no refetch call)
- [x] **Guarantee #8 amended in `CLAUDE.md` + `docs/system-architecture.md` + frontend satellite** — ✓ All three updated
- [x] **Root `package.json` + puppeteer; no `workspaces`** — ✓ Created; e2e script UNVERIFIED (no Docker)
- [x] **Docs asserting "no root package.json" corrected** — ✓ CLAUDE.md, README.md, code-standards-frontend.md all corrected
- [x] **0 broken relative links (8 known fe-libs links fixed)** — ✓ All 8 consolidated/repointed
- [ ] **No `localStorage`/`sessionStorage` token writes; SDK 44 green; `make smoke` 200; typecheck/build green** — Code ✓; Browser evidence UNVERIFIED

## Risks

| Risk | Mitigation |
|------|-----------|
| Refetch remounts open remote | String deps only in `RemoteOutlet` |
| Nav flicker on refetch | Stay `status: 'ready'` while refreshing |
| Remote `pushState` ≠ shell `popstate` | Focus/visibility triggers, not route observation |
| P4 → event bus creep | One typed one-way callback; code-standards limit note |
| `onNotify` accidentally wired to refetch | Explicit decision 6 + success criterion |
| Root `package.json` → workspace / huge Chromium | No `workspaces`; `.dockerignore` excludes root `node_modules` |
| P3+P4 doc file conflict | Serialize `code-standards-frontend.md` edits |
| `system-architecture.md` already ~868 lines | Surgical edits only |

## Related

- Spec: `docs/brainstorm/2026-09-14-cross-remote-state-spec.md`
- `docs/system-architecture.md` §3.4, §3.5
- `docs/code-standards-frontend.md` §2.3, §2.8
- `docs/codebase-summary.md` §5.2, §5.3
- `plans/260913-2113-admin-remote-ui/plan.md`

## Cook

```text
/cook --auto /Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/plans/260913-2241-cross-remote-state/plan.md
```

Or parallel after P1: `/cook --parallel` same path (P2∥P3; watch doc ownership).
