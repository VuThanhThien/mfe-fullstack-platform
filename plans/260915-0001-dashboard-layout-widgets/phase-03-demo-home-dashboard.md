# Phase 3 — Demo Home + Dashboard

## Context Links

- Spec §4–§5 (demo host, fixtures)
- Scout: reference `Home.tsx` / `Dashboard.tsx` grids
- Current: `remotes/demo-react/src/DemoApp.tsx`, `pages/HomePage.tsx`, `pages/StatusPage.tsx`
- Package: `@mfe/ui/widgets` from P1

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 5h
- **Risk:** medium — routing width, recharts install, replace Home content

Extend demo-react: fixture-driven Home widget grid + `/dashboard` analytics grid using `@mfe/ui/widgets`. Add `recharts` dependency. Keep Status optional. No nested sidebar; optional `PageToolbar` for Home↔Dashboard links.

## Key Insights

- Remove `maxWidth: 560` wrapper for Home/Dashboard (scout).
- Do **not** port `AdminAppBar` — shell owns chrome; use `PageToolbar` from `@mfe/ui` for in-page title/nav only.
- Welcome can take optional name from existing `api` profile fetch **in the page**, still pass strings into widget props (fixtures for charts; profile optional enhancement).
- Assets: consume package import/`imgSrc` only — **do not** add a second `public/assets` fork “just in case”.
- Federation: do **not** add recharts to `shared` — bundle in remote.
- **Must** add both `recharts` and `@mui/icons-material` to demo `dependencies` (optional peer does not auto-install).
- Strip `DemoApp` marketing chrome (`maxWidth: 560`, “Demo React Remote” blurb, duplicate link row) — outlet + `PageToolbar` only; optionally keep narrow wrapper **only** on `/status`.
- Prefer MUI **Grid2** for new grids (avoid legacy `Grid item` typing traps).
- Register `/dashboard` **before** `path="*"`.

## Requirements

- Routes: `/` → Home grid; `/dashboard` → Dashboard grid; `/status` may remain.
- Fixtures: `src/fixtures/home.ts`, `src/fixtures/dashboard.ts` (English + series).
- Deps: `recharts` in demo `dependencies` (align ~2.15 with reference).
- Dockerfile: ensure install picks up recharts (normal pnpm install of package.json).

## Related Code Files

**Create**

- `remotes/demo-react/src/fixtures/home.ts`
- `remotes/demo-react/src/fixtures/dashboard.ts`
- `remotes/demo-react/src/pages/DashboardPage.tsx` (analytics grid)

**Modify**

- `remotes/demo-react/src/pages/HomePage.tsx` — widget grid + fixtures
- `remotes/demo-react/src/DemoApp.tsx` — strip marketing/maxWidth; routes; PageToolbar
- `remotes/demo-react/package.json` + `pnpm-lock.yaml` — **recharts** + **@mui/icons-material**
- `remotes/demo-react/Dockerfile` — only if install path needs change after lock refresh

**Must not touch:** shell, admin, `packages/mfe-ui/**`, compose, docs

## Implementation Steps

1. Add `recharts` + `@mui/icons-material`; `pnpm install`; refresh lockfile.
2. Author fixtures from reference widget hard-coded series/labels (English); relative/static media only.
3. **First:** rewrite `DemoApp` — remove root `maxWidth: 560` / marketing header; PageToolbar for Home↔Dashboard; Status optional.
4. Rewrite `HomePage` as Grid2 composing `@mfe/ui/widgets` Home set.
5. Add `DashboardPage` (Grid2 breakpoints); route `/dashboard` before `*`.
6. If keeping profile → Welcome name: pass **string** props only (no raw API object into widgets).
7. `pnpm typecheck` + `pnpm build`; rebuild demo Docker image if using compose.
8. Manual via gateway: `/app/demo`, `/app/demo/dashboard`, hard refresh dashboard (must not land on Status copy).

## Todo List

- [x] Add recharts dep + lockfile
- [x] fixtures home + dashboard
- [x] HomePage widget grid
- [x] DashboardPage + route
- [x] PageToolbar / nav links; fix width
- [x] typecheck + build
- [x] Manual smoke under :8080

## Success Criteria

- [x] Both pages render widgets without console import errors
- [x] No second drawer inside remote
- [x] Status still reachable if kept

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| `@mfe/ui/widgets` resolve fail under Vite file: | Verify export map; restart vite |
| Dark mode chart colors | Widgets use theme palette |
| Profile API failure on Home | Fixtures don’t depend on API; welcome fallback name |

## Security Considerations

- Still use `api.*` only if keeping profile fetch; no axios in demo.
- No tokens in fixtures/URLs.

## Next Steps

→ P4 e2e asserts Home + Dashboard copy.
