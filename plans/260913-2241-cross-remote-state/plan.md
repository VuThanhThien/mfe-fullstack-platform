---
title: "Cross-Remote State Sharing"
description: "Share context/state between shell and remotes via server state + URL, plus an approved additive mount-context extension; fix remote sub-route routing."
status: pending
priority: P1
effort: 7h
branch: master
tags: [feature, frontend, refactor, infra]
created: 2026-09-13
---

# Cross-Remote State Sharing

## Goal

Let pages/remotes share context and state without breaking the locked remote contract. Deliver the two mechanisms that need no contract change — **server state** (`api.*` + refetch) and **URL** (query string) — plus one **approved** additive extension of the mount context.

## Problem statement (verified)

**(a) `accessible` is a boot-time snapshot.** `shell/src/auth/Gate.tsx:33-71` fetches inside `useEffect(..., [])`. When `admin-react` creates or edits an `MfeConfig`, the shell nav does **not** update until a full reload. Cache invalidation problem, not an event-bus problem.

**(b) Remote sub-routes likely break on refresh.** `shell/src/App.tsx:25` is `<Route path=":routeName" element={<RemoteOutlet />} />` — **no `/*` splat** — and line 26 is `<Route path="*" element={<NotFound />} />`. `:routeName` matches exactly one segment, but `admin-react` renders `BrowserRouter basename={basePath}` with real sub-routes (`AdminApp.tsx:27-49`), so the URL becomes `/app/admin/users`. On hard refresh the shell router matches `*` → **NotFound**.

Corroborating evidence: the admin plan's own criterion is still unticked —
`plans/260913-2113-admin-remote-ui/plan.md:101: - [ ] Deep-link /app/admin/users works after refresh`.

> Status: (b) is inferred from router config + the unticked criterion. **Not yet browser-verified** — Phase 1, step 1.

**(c) List state is not shareable.** `UsersListPage`, `ScopesListPage`, `ConfigsListPage` all keep paging in `useState`, so no list URL can be shared or refreshed on the same page.

## Decisions (locked by user, 2026-09-13)

| # | Decision | Consequence |
|---|----------|-------------|
| 1 | **Amend Guarantee #8** — add optional `onNotify` / `locale` to mount ctx | Phase 4 is **in scope**, not gated; `CLAUDE.md` + `docs/system-architecture.md` must be updated in the same phase |
| 2 | **Declare puppeteer** via a root `package.json` | Phase 5 creates a root `package.json` and fixes `scripts/e2e-demo-remote.mjs`; docs asserting "no root package.json" must be corrected |
| 3 | **Apply URL state to all three lists** | Phase 3 covers users + scopes + configs |
| 4 | **Defer the 6 broken links to Phase 5** | `plans/260913-2118-fe-libs-modernize/` is gone; 6 links must be repointed in the docs-sync phase |

## Constraints (must not break)

1. **Guarantee #8** — being **amended** here, but only additively: no token, no user object, no event bus.
2. **Non-goal** — event bus / widget view.
3. **Token rules** — access token memory-only; never localStorage/sessionStorage/cookie/URL.
4. **No remount of a live remote** on refetch — deps must stay string-based (`RemoteOutlet.tsx:112`).
5. **`registerRemotes` must keep `{ force: true }`** so newly-accessible remotes appear after refetch (`remote.ts:75`).
6. Root `package.json` must **not** define `workspaces` — the per-app package managers stay as they are.

## Approach (priority order)

| # | Mechanism | Contract change | Use for |
|---|-----------|-----------------|---------|
| A | Server state via `api.*` + refetch | No | Data one remote wrote, another reads |
| B | URL query string | No (needs splat fix) | Filters, paging, tabs — shareable + reload-safe |
| C | Additive mount ctx (`onNotify`, `locale`) | **Yes — #8 amended (approved)** | shell → remote one-way signals, mutation feedback |
| D | Narrow store inside `@mfe/sdk` | No, but adds SDK surface | In-memory reactive cross-remote state — **deferred** |

Existing precedent for sharing without ctx: `admin-react` already derives its own permissions from the shared token via `lib/jwt-scopes.ts` + `SoftGate`. Rule of thumb: **put shared state in the SDK, not in ctx.**

## Execution strategy

```
P1 routing fix (blocker) ──┬── P2 refetch accessible ──┐
                           └── P3 URL state (3 lists) ──┼── P5 verify + docs sync
P4 mount-ctx extension (approved) ─────────────────────┘
```

- **P1 first and alone** — P3 is worthless if a shared link 404s on reload.
- **P2 and P3 are independent** and can run in parallel (different files).
- **P4 is approved**, but touches the SDK contract + two docs — keep it a single coherent commit.
- **P5 last** — owns verification, the root `package.json`, doc sync, and the 6 broken links.

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `shell/src/App.tsx` | remotes, SDK |
| 2 | `shell/src/context/RemoteContext.tsx`, `shell/src/auth/Gate.tsx` | remote source, SDK public API |
| 3 | `remotes/admin-react/src/pages/**`, `docs/code-standards-frontend.md` | shell source, SDK public API |
| 4 | `packages/mfe-sdk/src/types.ts`, `shell/src/pages/RemoteOutlet.tsx`, `shell/src/layout/ShellLayout.tsx`, `remotes/admin-react/src/expose.tsx`, `CLAUDE.md`, `docs/system-architecture.md`, `docs/code-standards-frontend.md` | remote business logic beyond `onNotify` calls |
| 5 | root `package.json`, `scripts/**`, `plans/**`, `docs/**`, `README.md` | product code |

## Phases

| # | Phase | Effort | Output |
|---|-------|--------|--------|
| 1 | [Fix remote routing (splat)](./phase-01-fix-remote-routing-splat.md) | 0.5h | `:routeName/*`; deep-link verified |
| 2 | [Refetch `accessible`](./phase-02-refetch-accessible.md) | 1.5h | `refreshAccessibles` + focus/visibility triggers; no remount |
| 3 | [URL as shared state](./phase-03-url-as-shared-state.md) | 2.5h | `?page=` on all 3 lists + documented convention |
| 4 | [Mount-ctx extension](./phase-04-mount-context-extension.md) | 1.5h | Additive `onNotify`/`locale`; guarantee #8 amended |
| 5 | [Verify + sync docs](./phase-05-verify-and-sync-docs.md) | 1h | Root `package.json` + puppeteer; browser evidence; docs/links consistent |

Total ≈ **7h**.

## Out of scope

- Event bus / pub-sub across remotes (non-goal)
- SDK state store (option D) — revisit only if A+B+C prove insufficient
- Passing `userId`/`scopes`/token through mount ctx (still forbidden)
- Replacing per-remote `BrowserRouter` with a shell-provided router (breaks framework-agnostic contract)
- Vue/Angular remotes
- Converting the repo to a pnpm workspace (root `package.json` is for dev tooling only)

## Global success criteria

- [ ] Deep-link `/app/admin/users` renders the admin remote **after refresh** (no NotFound)
- [ ] Admin creates/edits an `MfeConfig` → shell nav updates **without full reload** (after focus or navigation)
- [ ] Refetch does **not** remount the currently mounted remote or lose in-progress form input
- [ ] `?page=2` works, is shareable, survives refresh, and back/forward works — on users, scopes **and** configs lists
- [ ] A remote mutation surfaces user-facing feedback via `onNotify` without importing shell code
- [ ] Guarantee #8 amended **explicitly** in `CLAUDE.md` + `docs/system-architecture.md`, and documented in the frontend satellite
- [ ] Root `package.json` exists with puppeteer as a devDependency; `node scripts/e2e-demo-remote.mjs` runs
- [ ] Docs asserting "no root package.json" (CLAUDE.md, README.md, `code-standards-frontend.md`) corrected
- [ ] 0 broken relative links across `docs/`, `plans/`, READMEs (6 known ones fixed)
- [ ] No `localStorage`/`sessionStorage` write anywhere (SDK spec still green)
- [ ] `make smoke` 200 on all gateway routes; SDK 44 tests green; typecheck/build green

## Risks

| Risk | Mitigation |
|------|-----------|
| Refetch remounts the open remote → lost form state | Keep `RemoteOutlet` deps string-based; never put the `item` object in deps |
| Refetch makes nav flicker | Stale-while-revalidate: keep `status: 'ready'` while refetching |
| Two `BrowserRouter`s share `window.history`; remote `pushState` does **not** emit `popstate` | Never rely on the shell router observing in-remote navigation; use focus/visibility triggers |
| Phase 4 drifts into a general event bus | One typed one-way callback only; explicit limit note in the satellite; a second callback needs a new decision |
| Root `package.json` pulls puppeteer's Chromium (~large) into the repo root | Dev-only; `.dockerignore` already excludes root `node_modules` — verify the build context stays small |
| Root `package.json` accidentally becomes a workspace root and changes app installs | Must not define `workspaces`; verify each app's lockfile is untouched |
| URL state applied to 3 lists multiplies blast radius | Land users first, verify, then copy; single convention documented once |
| `docs/system-architecture.md` grows further (already 868 lines) | Cap edits at a few lines; splitting it is a separate decision |

## Related

- `docs/system-architecture.md` §3.4 (auth flow), §3.5 (SDK contract)
- `docs/code-standards-frontend.md` §2.3 (patterns), §2.8 (Module Federation)
- `docs/codebase-summary.md` §5.2 (shell), §5.3 (remote contract)
- `plans/260913-2113-admin-remote-ui/plan.md` (the remote that needs this)
