# Scout report: dashboard layout widgets port

**Date:** 2026-09-15  
**Target (Repo A):** `micro-frontend-fullstack-2026`  
**Reference (Repo B):** `vite-micro-frontends/host-dashboard`

> **SUPERSEDED (plan authority):** Widgets + layout primitives live in `packages/mfe-ui` (`./widgets` + layout exports). Shell **is** rewritten onto the layout kit. Demo owns **pages + fixtures only** — not `remotes/demo-react/src/widgets/*`. Ignore create-tables below that put widgets in the remote or mark `ShellLayout` as untouched. See `plan.md` file ownership.

---

## Executive summary

Repo B’s admin home (`Home.tsx`) and analytics dashboard (`Dashboard.tsx`) are MUI `Grid` compositions of static/mock widgets; seven widgets depend on **recharts**. Repo A already owns authenticated chrome in **shell** (`ShellLayout`) and a slim **demo-react** remote with nested routes (`/` home profile panel, `/status`). **Plan (not this scout’s first draft):** port widgets into `@mfe/ui`, rewrite shell chrome, demo pages consume `@mfe/ui/widgets` + fixtures. Do **not** copy `AdminAppBar`. Widget media: Vite `import` URL or `imgSrc` prop — not bare `assets/…` strings.
---

## Repo A — current state

### Shell layout (`shell/src/layout/ShellLayout.tsx`)

- Flex column: fixed **AppBar** (title, `data-testid="theme-mode-toggle"`, logout), **permanent/temporary Drawer** (240px, links from `accessibles` → `/${routeName}` relative to basename `/app`), **main** (`Toolbar` spacer + `<Outlet />`), **Snackbar** via `NotifyContext`.
- Theme: `setMode` from `@mfe/ui`; no settings drawer, no collapsible nav.
- Remote content is only the main outlet; nav stays shell-owned.

### Demo remote routing & mount

| File | Role |
|------|------|
| `remotes/demo-react/src/expose.tsx` | `{ mount, unmount }`; passes full `RemoteMountContext` |
| `remotes/demo-react/src/DemoApp.tsx` | `ThemeProvider(createTheme)` + `BrowserRouter basename={basePath}`; routes: `index` → `HomePage`, `status` → `StatusPage`, `*` → `StatusPage` |
| `remotes/demo-react/src/pages/HomePage.tsx` | `GET /api/v1/users/me` via `@mfe/sdk` |
| `remotes/demo-react/src/pages/StatusPage.tsx` | Static “under construction” copy |

**Gap vs reference:** no dashboard grid route; content wrapped in `maxWidth: 560` — too narrow for widget layouts.

### `remotes/demo-react/package.json` deps

Runtime: `@mfe/sdk`, `@mfe/ui`, MUI 6, RRD 6, RHF, usehooks-ts. **No recharts.** Federation shares react, `@mfe/sdk`, RHF, MUI, emotion (see `vite.config.ts`).

### Docker

- `remotes/demo-react/Dockerfile`: copies `packages/mfe-sdk` + `packages/mfe-ui`, installs both, dev on `:5175`.
- `docker-compose.yml` bind-mounts for **demo-react**, **shell**, **admin-react**:
  - `./packages/mfe-ui/src:/workspace/packages/mfe-ui/src`
  - (plus app `src`, `vite.config.ts`, `mfe-sdk/src`)

Gateway: `/r/demo-react*` → `demo-react:5175` (`gateway/Caddyfile.compose`).

### `@mfe/ui` exports (`packages/mfe-ui/src/index.ts`)

- `ThemeMode`, `MODE_KEY`, `MODE_EVENT`, `getMode`, `setMode`, `subscribeMode`
- `createTheme(mode)` — palette, typography, shape, transitions, **component overrides** (`src/theme/components.ts`), mixins (incl. toolbar height used by shell)

No layout primitives, widgets, or chart helpers exported.

### E2E (`scripts/e2e-demo-remote.mjs`)

Asserts after login as `dashboard@example.com`:

1. `/app/demo` loads — no RUNTIME-008 / “Failed to load” / import errors  
2. Theme toggle present; `localStorage['mfe-ui-mode']` flips light/dark  
3. `/app/demo/status` shows status-ish copy (not Not Found)  
4. Hard refresh keeps `/app/demo/status`  
5. No token-like keys in localStorage/sessionStorage (except mode key)

Does **not** assert widget/chart content today.

---

## Repo B — reference inventory

### Widget files (`host-dashboard/src/admin/widgets/`)

| Widget | recharts |
|--------|----------|
| `ActivityWidget.tsx` | Line chart |
| `ViewsWidget.tsx` | Area chart |
| `BudgetWidget.tsx` | Radar chart |
| `SalesHistoryWidget.tsx` | Bar chart |
| `SalesByCategoryWidget.tsx` | Pie chart |
| `SalesByAgeWidget.tsx` | Radial bar |
| `CircleProgressWidget.tsx` | Radial bar |
| `WelcomeWidget.tsx` | — |
| `AchievementWidget.tsx` | — |
| `FollowersWidget.tsx` | — |
| `MeetingWidgets.tsx` | — |
| `PersonalTargetsWidget.tsx` | — |
| `ProgressWidget.tsx` | — (MUI `LinearProgress`) |
| `OverviewWidget.tsx` | — |
| `TeamProgressWidget.tsx` | — |
| `UsersWidget.tsx` | — |

**Page compositions:**

- `admin/pages/Home.tsx` — 3-column grid: Welcome+Achievement | Followers+Views | Targets+Meetings; wraps **AdminAppBar + AdminToolbar + RecentNotifications**.
- `admin/pages/Dashboard.tsx` — dense analytics grid (overview tiles + all chart widgets); **AdminAppBar + AdminToolbar** with page title.

### Layout chrome (brief)

| Component | Path | Purpose |
|-----------|------|---------|
| `AdminDrawer` | `admin/components/AdminDrawer.tsx` | Logo, i18n nav, profile footer, settings button; collapsed width via `SettingsProvider` |
| `AdminAppBar` | `admin/components/AdminAppBar.tsx` | Fixed bar offset by drawer width |
| `AdminToolbar` | `admin/components/AdminToolbar.tsx` | Mobile menu + `h2` title + slot for actions |
| `SettingsDrawer` | `core/components/SettingsDrawer.tsx` | Temporary left drawer: language radios + light/dark toggle |

`Admin.tsx` layout: `AdminDrawer` + `SettingsDrawer` + main (`Toolbar` spacer + `<Outlet />`). **Analog in Repo A:** shell `ShellLayout` already covers drawer/AppBar/theme/logout — port widgets only, not full admin shell.

### Public assets (`host-dashboard/public/assets/`)

Used by widgets / chrome:

- **`welcome.svg`** — `WelcomeWidget` (`assets/welcome.svg`)
- Also: `logo.svg`, `help.svg`, `empty.svg`, `error.svg`, `403.svg`, `404.svg`, `confirm.svg`, `success.svg`, `constructions.svg`, `vue.svg` (error/empty pages, Logo, HelpCenter — optional for demo port)

Reference uses bare `assets/...` paths (Vite public folder). In Repo A, serve from `remotes/demo-react/public/assets/` → URL `/r/demo-react/assets/welcome.svg`.

### Reference coupling to strip

- `react-i18next` → inline English or small local copy map  
- `remoteAuth` / `useAuth` → `HomePage` already loads profile via SDK; pass `firstName` into Welcome  
- `SettingsProvider` / collapsible drawer — out of scope unless shell plan changes  
- `QueryWrapper` — not needed for static widgets  
- `recharts@^2.15.1` — add to demo-react if importing chart widgets; consider federation **not** sharing recharts (bundle inside remote)

---

## Port strategy (recommended)

1. **Phase A — Home-style grid (no recharts):** Port `Home.tsx` layout + nine non-chart widgets; replace Welcome auth with SDK profile; copy `welcome.svg` (+ optional `logo.svg`).
2. **Phase B — Dashboard grid:** Add `recharts` + seven chart widgets; mirror `Dashboard.tsx` breakpoints (`xs={6} md={3}` overview row, etc.).
3. **In-remote chrome:** Optional thin `DemoPageHeader` (title only) — **not** `AdminAppBar` (shell AppBar remains single source).
4. **Routing:** e.g. `/` keep profile panel or merge welcome row; add `/dashboard` for analytics grid; update nav links in `DemoApp.tsx`; relax `maxWidth` on dashboard routes.
5. **Theme:** Widgets use MUI `Card`/`Paper`; align with `@mfe/ui` component overrides; verify charts in dark mode.
6. **E2E:** Extend `scripts/e2e-demo-remote.mjs` with text/DOM checks on `/app/demo/dashboard` (or chosen path) and zero failed chart asset requests.

---

## Files to create / modify (Repo A)

### Create

| Path | Notes |
|------|-------|
| `remotes/demo-react/src/pages/DashboardHomePage.tsx` | Grid from reference `Home.tsx` |
| `remotes/demo-react/src/pages/DashboardAnalyticsPage.tsx` | Grid from reference `Dashboard.tsx` |
| `remotes/demo-react/src/widgets/*.tsx` | Ported widgets (16 files) |
| `remotes/demo-react/src/components/DemoPageHeader.tsx` | Optional title row |
| `remotes/demo-react/public/assets/welcome.svg` | Required for Welcome |
| `remotes/demo-react/public/assets/*.svg` | Optional extras from reference |

### Modify

| Path | Notes |
|------|-------|
| `remotes/demo-react/src/DemoApp.tsx` | Routes, layout width, nav links |
| `remotes/demo-react/package.json` | `recharts` (+ `@types` if needed) when Phase B |
| `remotes/demo-react/pnpm-lock.yaml` | Lock after dep add |
| `scripts/e2e-demo-remote.mjs` | Dashboard route + content smoke |
| `docs/code-standards-frontend.md` | Optional: demo remote widget conventions |

### Unlikely / defer

| Path | Reason |
|------|--------|
| `shell/src/layout/ShellLayout.tsx` | Shell chrome sufficient |
| `packages/mfe-ui/src/index.ts` | No widget exports unless shared cards extracted later |
| `docker-compose.yml` | mfe-ui mount already present |
| `remotes/demo-react/Dockerfile` | No change unless new install steps |

---

## Risks & decisions

- **Double AppBar:** Copying `AdminAppBar` into remote pages will clash with shell — omit or use in-content title only.
- **Nav link bug check:** Drawer uses `to={\`/${item.routeName}\`}` under basename `/app` — verify resolves to `/app/demo` (RR6 relative rules); unrelated to widgets but affects E2E.
- **Bundle size:** Full dashboard + recharts increases demo remote payload; acceptable for demo route.
- **MUI Grid:** Reference uses legacy `Grid` `item` API (MUI 6 still supports); keep same for faithful layout or migrate to Grid2 in a follow-up.

---

## Source paths (absolute)

**Repo A:**  
`/Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/shell/src/layout/ShellLayout.tsx`  
`/Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/remotes/demo-react/`  
`/Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/packages/mfe-ui/src/index.ts`  
`/Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/scripts/e2e-demo-remote.mjs`

**Repo B:**  
`/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/host-dashboard/src/admin/widgets/`  
`/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/host-dashboard/src/admin/pages/Home.tsx`  
`/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/host-dashboard/src/admin/pages/Dashboard.tsx`  
`/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/host-dashboard/public/assets/`
