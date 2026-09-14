---
title: "Dashboard layout kit + widgets (@mfe/ui)"
description: "Expand @mfe/ui with layout primitives and presentational widgets; rewrite shell chrome; demo Home + Dashboard fixtures."
status: completed
updated: 2026-09-15
priority: P1
effort: 18h
branch: master
tags: [feature, frontend, ui, docs]
created: 2026-09-15
updated: 2026-09-15
spec: docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md
---

# Dashboard layout kit + widgets (`@mfe/ui`)

**Spec (approved):** [`docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md`](../../docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md)  
**Mode:** `--parallel` after P1  
**Research:** [`research/researcher-01-package-exports.md`](./research/researcher-01-package-exports.md)  
**Scout:** [`reports/scout-report.md`](./reports/scout-report.md) — **override:** widgets live in `@mfe/ui`, not `demo-react/src/widgets` (spec §4)

## Goal

Expand `@mfe/ui` beyond theme-only: **layout kit** (header/drawer/footer/toolbar) + **presentational Home/Dashboard widgets** (`@mfe/ui/widgets`, recharts optional peer). Rewrite shell to compose layout kit (accessible-driven nav). Port demo to fixture-driven Home + Dashboard grids. No feedback comps in package. Admin inherits shell chrome only.

## Problem statement

- Shell chrome is plain; reference host-dashboard has polished drawer/header widths + rich widget grids.
- Theme plan shipped tokens only and deferred charts; this plan supersedes that non-goal for layout + widgets.
- Demo Home is a thin profile panel; need showcase Home + `/dashboard` analytics without nested sidebars or i18n/auth from the reference.

## Decisions (locked — from spec)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Track | Full Dashboard showcase + shell layout polish |
| 2 | `@mfe/ui` | theme + layout + widgets + widget assets; **no feedback/** |
| 3 | Host | `demo-react` Home + Dashboard |
| 4 | Chrome | layout kit in package; shell wires; no nested remote drawer |
| 5 | Data | fixtures in demo; props-only widgets |
| 6 | Strings | English props; no i18n in package |
| 7 | Exports | `.` = theme/mode/layout; `./widgets` = charts/cards (no re-export from `.`) |
| 8 | MF shared | `@mfe/ui` **not** shared |
| 9 | Mount ctx | unchanged |

## Constraints (must not break)

1. No tokens in storage beyond existing `mfe-ui-mode`.
2. No axios / `@mfe/sdk` / react-router hard dep / i18n inside `@mfe/ui`.
3. No Loader/Empty/Result/Confirm exports from `@mfe/ui`.
4. Shell must **not** import `@mfe/ui/widgets` (no recharts in shell graph).
5. Nav from `accessibles` only — no hardcoded reference menu.
6. No second sidebar in remotes; no `AdminAppBar` copy into remotes.
7. Root `package.json` no `workspaces`; MF pin `1.16.6` unchanged.
8. Guarantee #8 mount contract unchanged.

## Execution strategy

```
P1 @mfe/ui layout + widgets + peers/exports/tests (blocker)
        │
        ├── P2 shell rewrite onto layout kit ──┐
        └── P3 demo Home + Dashboard + recharts ┼── P4 e2e + docs
```

- **P1 first** — package API + tests green before apps.
- **P2 ∥ P3** after P1 — exclusive ownership (shell vs demo).
- **P4 last** — e2e, docs, grep guardrails; admin smoke only (no admin src ownership).

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `packages/mfe-ui/**` | apps, compose, scripts, docs (except package README) |
| 2 | `shell/**` (src, package.json, lock, Dockerfile if peers need install) | remotes, mfe-ui src, compose, docs |
| 3 | `remotes/demo-react/**` | shell, admin, mfe-ui src, compose |
| 4 | `scripts/**`, `docs/**`, `CLAUDE.md`, `README.md`, brainstorm spec status | product logic except evidence edits |

Admin: **no phase** — inherits P2 chrome; P4 regression check only.

## Phases

| # | Phase | Effort | Output |
|---|-------|--------|--------|
| 1 | [Expand `@mfe/ui` layout + widgets](./phase-01-mfe-ui-layout-widgets.md) | 8h | Peers, exports, layout kit, widgets, vitest |
| 2 | [Shell layout rewrite](./phase-02-shell-layout-rewrite.md) | 3h | AppHeader/NavDrawer/AppFooter wired |
| 3 | [Demo Home + Dashboard](./phase-03-demo-home-dashboard.md) | 5h | Fixtures, routes, recharts dep |
| 4 | [E2E + docs sync](./phase-04-e2e-and-docs.md) | 2h | e2e, standards, supersession notes |

Total ≈ **18h**.

## Out of scope

- Feedback comps in `@mfe/ui`
- Profile/FAQ/Help/UserManagement, SettingsDrawer
- Backend metrics APIs
- Landing, Vue, MF-sharing `@mfe/ui`
- Admin CRUD redesign
- Pixel parity vs reference

## Global success criteria

- [x] `@mfe/ui` unit tests green; layout + ≥1 widget smoke (empty series OK)
- [x] Shell uses layout kit; footer visible; drawer still from accessibles; **no** `@mfe/ui/widgets` import
- [x] `/app/demo` Home widgets + `/app/demo/dashboard` chart grid render from fixtures
- [x] No double sidebar; Status may remain; hard refresh `/app/demo/dashboard` OK
- [x] Demo has `recharts`; shell/admin do not
- [x] E2E: home + dashboard content smoke; theme toggle + token hygiene still pass
- [x] Docs/CLAUDE: `@mfe/ui` = theme + layout + widgets; feedback per-app
- [x] shell/demo/admin typecheck + build green

## Risks

| Risk | Mitigation |
|------|------------|
| Shell pulls recharts | Separate `./widgets` export; P4 grep ban |
| Scout vs spec ownership drift | Spec wins — widgets in package |
| Widget count (~16) blows P1 | Batch: layout first in P1, then Home widgets, then chart widgets same phase |
| Vite `file:` + `./widgets` resolve fail | Research says OK; fallback single entry + import discipline |
| Collapse drawer scope creep | Fixed width first; collapse optional if time |
| Demo `maxWidth: 560` breaks grids | P3 remove narrow wrapper on Home/Dashboard |

## Related

- Spec: `docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md`
- Predecessor plan: `plans/260914-2316-shared-theme-mfe-ui/` (completed)
- Reference: `vite-micro-frontends/host-dashboard/src/admin/{pages,widgets,components}/`

## Audit (2026-09-15)

Applied: no brainstorm mutation in P4; cook = P1 then P2∥P3; scout superseded note; asset via import/props; DemoApp width/chrome strip; Docker lock rebuild; demo `recharts`+icons required; e2e dashboard hard-refresh + allowlist storage; Grid2 + route order; nav RR `Link` only; drawer state in-memory.

Deferred: full zod API→widget gate until live metrics (fixtures-only this plan); admin second-login storage pass.

## Cook

**Required order:** finish P1 (`packages/mfe-ui` test+typecheck green, lockfile committed) **before** starting P2/P3.

```text
/cook --parallel /Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/plans/260915-0001-dashboard-layout-widgets/plan.md
```

Cook must honor phase blockers: P1 → (P2 ∥ P3) → P4. Sequential fallback: `/cook --auto` same path.