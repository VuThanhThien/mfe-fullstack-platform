# Phase 1 — Expand `@mfe/ui` layout + widgets

## Context Links

- Spec: `docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md` §4–§7
- Research: `plans/260915-0001-dashboard-layout-widgets/research/researcher-01-package-exports.md`
- Scout inventory: `plans/260915-0001-dashboard-layout-widgets/reports/scout-report.md` (widget list; **ignore** “widgets in demo” ownership)
- Reference: `vite-micro-frontends/host-dashboard/src/admin/widgets/`, `core/config/layout.ts`
- Plan: `plans/260915-0001-dashboard-layout-widgets/plan.md`

## Overview

- **Priority:** P1 (blocker)
- **Status:** completed
- **Effort:** 8h
- **Risk:** high — peers/exports + many widgets

Grow `@mfe/ui`: React peers, `./widgets` subpath, layout primitives, presentational widgets (no feedback). Vitest jsdom + smoke tests. Theme/mode APIs stay stable.

## Key Insights

- `src/index.ts` must **not** re-export widgets — shell stays recharts-free.
- `recharts` = optional peer; package `devDependencies` only for tests; demo installs runtime later (P3).
- Strip i18n/`remoteAuth` — all labels/data are props.
- Feedback (Loader/Empty/Result/Confirm) **out** — do not port into package.
- Layout widths: `drawerWidth=280`, `drawerCollapsedWidth=104` (export constants; collapse optional for consumers).

## Requirements

- Exports: `.` → theme + mode + layout; `./widgets` → widget barrel.
- Layout: `AppHeader`, `NavDrawer`, `AppFooter`, `PageToolbar`, width constants.
- Widgets: Home set (Welcome, Achievement, Followers, Views, PersonalTargets, Meetings) + Dashboard set (Overview, Activity, Budget, SalesHistory, Progress, CircleProgress, SalesByCategory, SalesByAge, TeamProgress, Users) — props-only; rewrite MUI 6 + theme.
- Widget media: **Vite `import` URL or `imgSrc` prop only** — never bare `assets/welcome.svg` strings (404 under `/app/demo`). No generic empty/error asset set.
- Tests: existing mode/theme still pass; NavDrawer/AppFooter smoke; ≥1 chart widget empty-series no-throw.
- README: document import split + peers + “no feedback / no fetch”.

## Related Code Files

**Modify**

- `packages/mfe-ui/package.json` — peers, exports, vitest/react/recharts/testing-library devDeps
- `packages/mfe-ui/tsconfig.json` — jsx react-jsx, include tsx
- `packages/mfe-ui/vitest.config.ts` — plugin-react, jsdom
- `packages/mfe-ui/src/index.ts` — export layout only (+ existing theme/mode)
- `packages/mfe-ui/README.md`

**Create**

- `packages/mfe-ui/src/layout/index.ts`
- `packages/mfe-ui/src/layout/widths.ts`
- `packages/mfe-ui/src/layout/AppHeader.tsx`
- `packages/mfe-ui/src/layout/NavDrawer.tsx`
- `packages/mfe-ui/src/layout/AppFooter.tsx`
- `packages/mfe-ui/src/layout/PageToolbar.tsx`
- `packages/mfe-ui/src/layout/*.spec.tsx` (smoke)
- `packages/mfe-ui/src/widgets/index.ts`
- `packages/mfe-ui/src/widgets/*.tsx` (ported set)
- `packages/mfe-ui/src/widgets/*.spec.tsx` (minimal)
- `packages/mfe-ui/src/assets/*` (widget-needed SVGs)

**Must not touch:** shell, remotes, docker-compose, docs hub

## Implementation Steps

1. Update `package.json` per research report (exports `./widgets`, peers, `peerDependenciesMeta.recharts.optional`, devDeps for React testing + recharts).
2. Enable JSX in tsconfig + vitest jsdom + `@vitejs/plugin-react`.
3. Implement `layout/widths.ts` + four layout components (props/children; **no react-router**). Prefer shell passing `ListItemButton component={Link} to={...}` — do not encourage absolute external `href` in nav items.
4. Export layout from `src/index.ts` (not widgets).
5. Port widgets in batches: non-chart Home first, then recharts Dashboard widgets; English props; `useTheme()` for colors; avatars default to initials (no unconstrained remote image URLs in defaults).
6. Add `src/widgets/index.ts` barrel; wire `exports["./widgets"]`.
7. Bundle welcome SVG via `import` (or require `imgSrc` prop) — no public-path string.
8. Write smokes; run `pnpm test` + `pnpm typecheck` in package; **commit updated `pnpm-lock.yaml`**.
9. Update package README (supersede “theme-only / React-free”).
10. Exit gate: lockfile committed; note apps must rebuild Docker images after peer churn (P4 verifies builds).

## Todo List

- [x] package.json peers + `./widgets` export
- [x] tsconfig/vitest for React/tsx
- [x] layout components + widths + export from `.`
- [x] Home (non-chart) widgets
- [x] Dashboard (recharts) widgets + barrel
- [x] widget assets (imgSrc prop; no bare assets path)
- [x] unit smokes green
- [x] README updated

## Success Criteria

- [ ] Import `@mfe/ui` has no recharts in module graph
- [ ] Import `@mfe/ui/widgets` resolves and types work
- [ ] No feedback component exports
- [ ] `pnpm test` / `typecheck` green in package

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Too many widgets | Ship all named in Requirements; defer polish not count |
| Router coupling | Shell passes MUI `component={Link}` |
| Asset URL in package | Prefer import-as-URL or inline; document consumer path if public/ |

## Security Considerations

- No secrets; fixtures later in demo only.
- Mode key unchanged; no new storage keys in package.

## Next Steps

→ P2 shell and P3 demo can start in parallel after this phase merges/API stable.
