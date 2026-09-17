# @mfe/ui

Shared **MUI theme**, **layout kit**, **presentational auth UI**, and **widgets** for shell and remotes.

## Import surfaces

| Import | Contains | Pulls recharts? |
|--------|----------|-----------------|
| `@mfe/ui` | theme, mode, layout | **No** |
| `@mfe/ui/auth` | `LoginForm`, `SessionGate`, `loginSchema` | **No** |
| `@mfe/ui/widgets` | Home + Dashboard cards/charts | **Yes** (peer) |

**Never** re-export widgets or auth from `@mfe/ui`. Shell/admin import layout/theme only.

**Not in this package:** Loader / Empty / Result / ConfirmDialog (per-app), axios, token storage, Nest URLs, i18n, react-router ownership.

**Auth UI:** `LoginForm` + `SessionGate` are presentational (`@mfe/ui/auth`). Apps pass `onSubmit` / `bootstrap` that call `@mfe/sdk`. Hosted remotes must **not** wrap `expose` trees in `SessionGate`.

## Mode storage

| Constant | Value | Purpose |
|----------|-------|---------|
| `MODE_KEY` | `mfe-ui-mode` | `localStorage` — `'light'` \| `'dark'` only |
| `MODE_EVENT` | `mfe-ui:mode` | same-tab `CustomEvent` |

**Never** put access/refresh tokens in `localStorage`.

## Peers

Apps must still provide (federation / normal installs):

- `react`, `react-dom`, `@mui/material`, `@mui/icons-material`
- `react-hook-form` ^7.88, `zod` ^4.6, `@hookform/resolvers` ^5.9 — required for `LoginForm`
- `recharts` — **optional** peer; required only if you import `@mfe/ui/widgets`

**Docker / `file:` installs:** the auth runtime set is also listed under `dependencies` (`react`, `react-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`, RHF, zod, resolvers) so `pnpm install --prod` / npm `--omit=dev` materializes them inside `packages/mfe-ui` without Dockerfile `pnpm add`. Emotion is dependencies-only (MUI needs it; not a peer). Icons and recharts stay peer-only.

## Usage

```ts
import { createTheme, getMode, AppHeader, NavDrawer, AppFooter } from '@mfe/ui';
import { LoginForm, SessionGate, loginSchema } from '@mfe/ui/auth';
import { OverviewWidget, ActivityWidget } from '@mfe/ui/widgets';
import { login, refresh } from '@mfe/sdk';

// Standalone entry only — wire SDK callbacks; never wrap hosted expose trees.
<SessionGate
  bootstrap={() => refresh().then(() => undefined)}
  renderLogin={({ unreachable, retry }) => (
    <>
      {unreachable ? (
        <button type="button" onClick={retry}>API unreachable — Retry</button>
      ) : null}
      <LoginForm onSubmit={(v) => login(v).then(() => undefined)} />
    </>
  )}
>
  <App />
</SessionGate>
```

Widgets are **props-only** — pass English strings and series from the app (fixtures or `api.*`).

Welcome images: pass `imgSrc` from a Vite `import` URL — never bare `assets/…` paths.

## Local development

### Prerequisites

- `. .dev-bin/env.sh` from repo root
- Install when React apps need theme / layout / `@mfe/ui/auth`

### Install

```bash
cd packages/mfe-ui
pnpm install
```

### Env

None. Mode preference uses `localStorage` key `mfe-ui-mode` only (never tokens).

### Run

No `dev` script — source is imported via `file:` deps.

### Ports & origins

N/A (library).

### Quality

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:watch
```

### Verify

```bash
pnpm test && pnpm typecheck
```

### Related

- Hub: [docs/local-development-guide.md](../../docs/local-development-guide.md)
