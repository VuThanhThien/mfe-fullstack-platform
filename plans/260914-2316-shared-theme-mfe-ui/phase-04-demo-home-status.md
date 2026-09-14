# Phase 4 — Demo Home + Status

## Context Links

- Spec §4–§5 demo routes; plan ownership: `remotes/demo-react/**`
- `remotes/demo-react/src/expose.tsx` — **ignores ctx today** (must fix)
- `remotes/demo-react/src/DemoApp.tsx` — single profile panel
- Admin pattern: `remotes/admin-react/src/AdminApp.tsx` — `BrowserRouter basename={basePath}`
- Seed `routeName=demo` → URLs `/app/demo`, `/app/demo/status`
- Depends on: Phase 1

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 3.5h
- **Risk:** medium — nested router + ctx wiring

Pass mount `ctx` into demo; ThemeProvider + subscribeMode; nested routes Home + Status. Local Result/Loader only if needed — **not** in `@mfe/ui`.

## Key Insights

- Without `ctx.basePath`, nested `BrowserRouter` basename is wrong — deep links break.
- Shell splat `:routeName/*` already supports `/app/demo/status` (cross-remote-state P1).
- Keep `api.get('/api/v1/users/me')` on Home — proves SDK singleton.
- Do **not** port chart Dashboard widgets.

## Requirements

- `mount(el, ctx)` renders app with `basePath`, `routeName`, optional `onNotify`/`locale` (may ignore notify).
- Routes: index → Home; `status` → Status; `*` → Status or simple NotFound.
- Theme via `@mfe/ui` + subscribeMode.
- file: dep + Dockerfile; typecheck/build green.

## Related Code Files

**Modify**

- `remotes/demo-react/package.json` — `@mfe/ui` file dep (`../../packages/mfe-ui`)
- `remotes/demo-react/pnpm-lock.yaml`
- `remotes/demo-react/Dockerfile`
- `remotes/demo-react/src/expose.tsx` — pass `ctx`
- `remotes/demo-react/src/DemoApp.tsx` — become shell of router + theme **or** thin re-export
- `remotes/demo-react/src/main.tsx` — standalone preview: fake ctx / basename

**Create**

- `remotes/demo-react/src/pages/HomePage.tsx` — profile fetch (move logic from DemoApp)
- `remotes/demo-react/src/pages/StatusPage.tsx` — themed empty/under-construction Result
- Optional: `remotes/demo-react/src/components/Result.tsx`, `Loader.tsx`
- Optional: `remotes/demo-react/src/theme/use-theme-mode.ts`
- Optional: nav link Home ↔ Status inside demo

**Must not touch**

- shell, admin, mfe-ui src, compose, backend seed (routeName stays `demo`)

## Implementation Steps

1. Add `@mfe/ui` file dep; `pnpm install`.
2. Fix `expose.tsx`:
   ```tsx
   export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
     root = createRoot(el);
     root.render(<DemoApp {...ctx} />);
   }
   ```
3. Restructure `DemoApp` props: `RemoteMountContext`.
   - ThemeProvider + subscribeMode + CssBaseline
   - `BrowserRouter basename={basePath}`
   - Routes: index HomePage; path `status` StatusPage; path `*` StatusPage or NotFound
   - Small nav: Link to `/` and `/status` (relative)
4. Move profile fetch + `describeApiError` into `HomePage.tsx`.
5. `StatusPage.tsx`: Typography + Paper using theme tokens; no API.
6. `main.tsx` standalone: render with `basePath="/"` or `"/app/demo"` fake ctx for local vite.
7. Dockerfile COPY mfe-ui.
8. typecheck + build.

## Todo List

- [ ] file: dep + Dockerfile
- [ ] expose.tsx passes ctx
- [ ] ThemeProvider + subscribeMode
- [ ] Nested BrowserRouter + Home / Status routes
- [ ] HomePage keeps users/me api call
- [ ] StatusPage static themed
- [ ] typecheck + build

## Success Criteria

- `/app/demo` shows Home with profile (or error Alert).
- `/app/demo/status` shows Status page.
- Hard refresh on `/app/demo/status` still mounts demo (shell splat — verify in P5).
- Mode toggle in shell updates demo same-tab.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| basename mismatch | Use `ctx.basePath` from shell (`/app/demo`) |
| Standalone main breaks | Fake ctx in main.tsx |
| Over-building Status | Keep one simple page |

## Next Phase

P5 e2e covers demo paths + mode + storage assertions.
