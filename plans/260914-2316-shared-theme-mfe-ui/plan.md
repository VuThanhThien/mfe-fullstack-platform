---
title: "Shared Theme (@mfe/ui) + Demo Showcase"
description: "Add packages/mfe-ui theme + mode sync; wire shell toggle and remotes; expand demo-react with Home + Status pages."
status: completed
priority: P1
effort: 11h
branch: master
tags: [feature, frontend, infra, docs]
created: 2026-09-14
updated: 2026-09-14
spec: docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md
---

# Shared Theme (`@mfe/ui`) + Demo Showcase

**Spec (approved):** [`docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md`](../../docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md)  
**Mode:** parallel-friendly after P1 (Approach 1 from brainstorm).

## Goal

Ship `packages/mfe-ui` (MUI theme factory + light/dark mode I/O). Wire shell AppBar toggle + ThemeProviders in shell, demo-react, admin-react. Sync mode via `localStorage` + same-tab event (no mount-ctx change). Expand demo-react to Home + Status under `/app/demo/*`. Document Landing → Next.js as deferred TODO.

## Problem statement

- Shell has no ThemeProvider; admin uses default `createTheme()`; demo has none → inconsistent chrome.
- Remotes mount in separate React roots → shell theme context does not reach remotes.
- Roadmap Phase D TODO: port reference theme (rewrite MUI, not Tailwind copy).
- Demo is a single stub panel; worth a slim two-page showcase.

## Decisions (locked — from spec)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Package | `packages/mfe-ui` = **theme only** (React-free) |
| 2 | Adopters | shell + demo-react + admin-react; **skip landing** |
| 3 | Mode | dual palette + shell toggle |
| 4 | Sync | `MODE_KEY` localStorage + `MODE_EVENT` CustomEvent (+ `storage`) |
| 5 | Mount ctx | **no** `themeMode` (Guarantee #8 unchanged) |
| 6 | Demo pages | exactly **Home** + **Status** (not chart Dashboard) |
| 7 | MF shared | `@mfe/ui` **not** in federation `shared` v1 |
| 8 | Landing | Next.js migration = roadmap TODO only |

## Constraints (must not break)

1. Access/refresh tokens never in localStorage/sessionStorage/URL — mode key only stores `'light'|'dark'`.
2. No axios / `@mfe/sdk` imports inside `@mfe/ui`.
3. No React components exported from `@mfe/ui`.
4. No cross-app UI imports; no landing `@mfe/ui` this plan.
5. Root `package.json` must not gain `workspaces`.
6. `@module-federation/vite@1.16.6` pin unchanged.
7. Docker/`file:` install mirrors `@mfe/sdk` pattern.

## Execution strategy

```
P1 @mfe/ui package (blocker)
        │
        ├── P2 shell ThemeProvider + toggle + Dockerfile  ──┐
        ├── P3 admin ThemeProvider + Dockerfile             ├── P5 e2e + compose volumes + docs
        └── P4 demo theme + Home/Status + ctx + Dockerfile ─┘
```

- **P1 first** — nothing installs until package exists + tests green.
- **P2 ∥ P3 ∥ P4** after P1 — exclusive app ownership.
- **P5 last** — compose volumes (one file), e2e, roadmap/CLAUDE/standards.

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `packages/mfe-ui/**` | apps, docker-compose, docs (except package README) |
| 2 | `shell/**` (src, package.json, pnpm-lock, Dockerfile) | remotes, mfe-ui src, compose |
| 3 | `remotes/admin-react/**` (AdminApp theme wiring, package.json, lock, Dockerfile) | shell, demo, mfe-ui src, compose |
| 4 | `remotes/demo-react/**` | shell, admin, mfe-ui src, compose |
| 5 | `docker-compose.yml`, `scripts/**`, `docs/**`, `CLAUDE.md`, `README.md`, brainstorm spec status | product logic in apps (evidence only) |

## Phases

| # | Phase | Effort | Output |
|---|-------|--------|--------|
| 1 | [Scaffold `@mfe/ui`](./phase-01-scaffold-mfe-ui.md) | 3h | Package + vitest; createTheme + mode API |
| 2 | [Shell theme + toggle](./phase-02-shell-theme-toggle.md) | 2h | ThemeProvider + AppBar toggle + Docker/`file:` |
| 3 | [Admin theme adopt](./phase-03-admin-theme-adopt.md) | 1h | Replace default theme; subscribeMode |
| 4 | [Demo Home + Status](./phase-04-demo-home-status.md) | 3.5h | ctx mount; nested routes; theme; two pages |
| 5 | [E2E + docs sync](./phase-05-e2e-and-docs.md) | 1.5h | compose volumes; e2e; roadmap Next.js TODO |

Total ≈ **11h**.

## Out of scope

- Landing `@mfe/ui` / Landing → Next.js implementation
- Components inside `@mfe/ui`; full reference catalog
- Chart Dashboard / host-dashboard widgets
- `@mfe/ui` in MF `shared`
- Vue/Angular, MinIO, CI pipelines
- `themeMode` on `RemoteMountContext`

## Global success criteria

- [x] `@mfe/ui` unit tests green; `createTheme('light'|'dark')` works — Code ✓ (8 tests)
- [x] Shell toggle flips mode; remotes update same-tab without remount — Code ✓; Browser ✓ (e2e mode→dark)
- [x] `/app/demo` Home + `/app/demo/status` work; hard refresh status OK — Code ✓; Browser ✓ (statusOk + refreshOk)
- [x] Admin uses `@mfe/ui` (no default `createTheme()`) — Code ✓
- [x] Dockerfiles COPY/install `@mfe/ui`; compose mounts `packages/mfe-ui/src` for shell/demo/admin — Code ✓
- [x] Only new storage key: `mfe-ui-mode`; no auth tokens in storage — Code ✓; Browser ✓ (`lsKeys: [mfe-ui-mode]`)
- [x] Landing does not import `@mfe/ui` — Code ✓ (grep)
- [x] Docs: roadmap theme progress + **Landing → Next.js** TODO; CLAUDE topology; frontend standards — Code ✓
- [x] shell/demo/admin `typecheck` + `build` green — Code ✓; `make smoke` — ✓

## Risks

| Risk | Mitigation |
|------|------------|
| Theme `components.tsx` needs `@mui/icons-material` | Peer both `@mui/material` + `@mui/icons-material`, or strip icon overrides in P1 |
| Docker/`file:` miss | Mirror SDK Dockerfile; fail build early |
| Scope creep to chart Dashboard | Spec locks Home + Status only |
| Mode vs token confusion | Docs + e2e assert tokens absent |
| `docker-compose.yml` edit conflicts | P5 owns compose exclusively |
| FOUC | Sync `getMode()` before first paint; accept residual flash |

## Related

- Spec: `docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md`
- Reference: `vite-micro-frontends` `**/theme/` (MUI)
- Pattern: `packages/mfe-sdk/` + app Dockerfiles
- Admin nested router: `remotes/admin-react/src/AdminApp.tsx`
- Prior plan: `plans/260913-2241-cross-remote-state/`

## Cook

```text
/cook --parallel /Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/plans/260914-2316-shared-theme-mfe-ui/plan.md
```

Or sequential: `/cook --auto` same path (P1 → P2∥P3∥P4 → P5).
