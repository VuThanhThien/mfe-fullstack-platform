# @mfe/ui

Shared **MUI theme**, **layout kit**, and **presentational widgets** for shell and remotes.

## Import surfaces

| Import | Contains | Pulls recharts? |
|--------|----------|-----------------|
| `@mfe/ui` | theme, mode, layout (`AppHeader`, `NavDrawer`, `AppFooter`, `PageToolbar`) | **No** |
| `@mfe/ui/widgets` | Home + Dashboard cards/charts | **Yes** (peer) |

**Never** re-export widgets from `@mfe/ui`. Shell must import layout/theme only.

**Not in this package:** Loader / Empty / Result / ConfirmDialog (per-app), axios, auth, i18n, react-router.

## Mode storage

| Constant | Value | Purpose |
|----------|-------|---------|
| `MODE_KEY` | `mfe-ui-mode` | `localStorage` — `'light'` \| `'dark'` only |
| `MODE_EVENT` | `mfe-ui:mode` | same-tab `CustomEvent` |

**Never** put access/refresh tokens in `localStorage`.

## Peers

- `react`, `react-dom`, `@mui/material`, `@mui/icons-material`
- `recharts` — **optional** peer; required only if you import `@mfe/ui/widgets`

## Usage

```ts
import { createTheme, getMode, AppHeader, NavDrawer, AppFooter } from '@mfe/ui';
import { OverviewWidget, ActivityWidget } from '@mfe/ui/widgets';
```

Widgets are **props-only** — pass English strings and series from the app (fixtures or `api.*`).

Welcome images: pass `imgSrc` from a Vite `import` URL — never bare `assets/…` paths.

## Test

```bash
. ../../.dev-bin/env.sh
pnpm test
pnpm typecheck
```
