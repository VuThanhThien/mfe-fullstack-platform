# shell

Authenticated React host for the MFE platform.

**Shipped** (Phase C, P5)

## Overview

| Concern | Value |
|---------|-------|
| Base path | `/app/` |
| Port (internal) | `5174` |
| External origin | `http://localhost:8080` (via Caddy) |
| Router basename | `/app` |
| Auth | Refresh cookie on every boot via `@mfe/sdk` |
| Federation | `@module-federation/vite@1.16.6` host; remotes registered at runtime |

## Boot sequence

```
refresh()                          — hydrates access token from HttpOnly cookie
  401 → /login?next=<current path>
GET /api/v1/mfe-configs/accessible — scoped list for the authenticated user
registerRemotes(items)             — wires MF runtime
render <ShellLayout>               — nav from accessible; routes to <RemoteOutlet>
```

## Repo structure

```
shell/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx                   — entry point
    ├── App.tsx                    — BrowserRouter basename="/app" + Gate
    ├── context/
    │   └── RemoteContext.tsx      — accessible items + userId provider
    ├── auth/
    │   └── Gate.tsx               — boot guard (refresh → accessible → registerRemotes)
    ├── layout/
    │   └── ShellLayout.tsx        — AppBar + nav drawer + logout + <Outlet>
    └── pages/
        ├── RemoteOutlet.tsx       — :routeName → loadRemote → mount/unmount
        ├── NotFound.tsx           — unknown routeName (no loadRemote)
        └── Unsupported.tsx        — framework !== 'react' (no loadRemote)
```

## Install & run

> Prerequisite: `packages/mfe-sdk` must be installed first (it is a `file:` dep).

```bash
# From the umbrella root
cd packages/mfe-sdk && pnpm install
cd ../../shell && pnpm install
pnpm dev      # http://localhost:5174 (internal); route via http://localhost:8080/app/
```

## Vite / federation notes

- **`remotes: {}`** in `vite.config.ts` is intentional — remotes are registered at
  runtime from the `accessible` API response, not hardcoded here.
- Shared singletons: `react`, `react-dom`, `@mfe/sdk`, `@mui/material`, `@emotion/*`.
  All remotes (e.g. `demo-react`) **must** declare the same singletons with the same
  major version to avoid duplicate-React issues.
- `@module-federation/vite` is pinned at `1.16.6`. **Do not bump** without regression
  testing — versions ≥ 1.16.9 have a known React 18 duplicate-instance regression.

## Remote contract

Every remote must expose a module satisfying:

```ts
export interface RemoteModule {
  mount(el: HTMLElement, ctx: { basePath: string; routeName: string }): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

- `basePath` = `/app/<routeName>` (e.g. `/app/demo`)
- **No token, no user object** in mount context — remotes use `import { api } from '@mfe/sdk'`

## Error handling

| Scenario | Behaviour |
|----------|-----------|
| Boot `refresh()` 401 | Redirect to `/login?next=<path>` |
| `accessible` 4xx/5xx | Redirect to login (shell can't boot) |
| Unknown `:routeName` | `<NotFound>` — no `loadRemote` call |
| `framework !== 'react'` | `<Unsupported>` — no `loadRemote` call |
| `loadRemote` / `mount` throws | Error panel in outlet + Retry button; nav stays |
| Empty accessible list | Empty state in drawer + main; not an error |
| Logout | `logout()` → `window.location.assign('/login')` |

## Dependencies

```json
{
  "@mfe/sdk": "file:../packages/mfe-sdk",
  "@module-federation/vite": "1.16.6",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "@mui/material": "^6.1.0",
  "@emotion/react": "^11.13.0",
  "@emotion/styled": "^11.13.0"
}
```
