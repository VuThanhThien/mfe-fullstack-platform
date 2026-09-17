# shell

Authenticated React host for the MFE platform.

**Shipped** (Phase C, P5) — mounts `framework: 'react' | 'vue'`. Home launcher + nested API nav tree.

## Overview

| Concern | Value |
|---------|-------|
| Base path | `/app/` |
| Port (internal) | `5174` |
| External origin | `http://localhost:8080` (via Caddy) |
| Router basename | `/app` |
| History sync | `ShellHistorySync` + `@mfe/sdk` `subscribeLocationChange` (pathname-only) |
| Auth | Refresh cookie on every boot via `@mfe/sdk` |
| Federation | `@module-federation/vite@1.22.0` host; remotes registered at runtime |

## Chrome (launcher + nested nav)

| Route | UX |
|-------|----|
| `/app` | `HomeLauncher` — accessible `MfeConfig` widgets (`iconUrl?`). **No** app drawer. |
| `/app/:routeName/*` | Header Apps popover (same list) + nested drawer from lazy nav API |

```
GET /api/v1/mfe-configs/accessible
GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible   # 404 if config not accessible
```

Nav is **UX**, not ACL. Mount ctx is unchanged (`{ basePath, routeName, locale?, onNotify? }`). Remotes must not add a second AppBar/Drawer.

**React remotes** under this host **MUST** use `SyncedMemoryRouter` from `@mfe/sdk/react-router` — **MUST NOT** nest `BrowserRouter`. See [synced-memory-router brainstorm](../docs/brainstorm/2026-09-17-synced-memory-router-location-sync.md) and frontend standards §2.3.2.

Spec: [app-launcher-nav-tree](../docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md).

## Boot sequence

```
refresh()                          — hydrates access token from HttpOnly cookie
  401 → /login?next=<current path>
GET /api/v1/mfe-configs/accessible — scoped list for the authenticated user
registerRemotes(items)             — wires MF runtime
render <ShellLayout>               — Home launcher; per-app drawer from lazy nav API
```

## Local development

### Prerequisites

- `. .dev-bin/env.sh`
- Backend `:3000` + gateway (host Caddy or `make up`) for real hosted DX
- Remotes you care about running (product `:5175`, admin `:5176`, vue `:5177`)
- Install `packages/mfe-sdk` + `packages/mfe-ui` first

Shell is **not** Spec A standalone — always pair with gateway for `/app` origin.

### Install

```bash
cd packages/mfe-sdk && pnpm install
cd ../mfe-ui && pnpm install
cd ../../shell && pnpm install
```

### Env

None required. Prefer browsing via `http://localhost:8080/app/`.

### Run (hosted)

```bash
pnpm dev      # listens :5174 (internal)
```

Open `http://localhost:8080/app/` after Caddy + backend + remotes are up.

### Ports & origins

| Mode | URL |
|------|-----|
| Vite (internal) | `http://localhost:5174` |
| Gateway | `http://localhost:8080/app/` |

Ensure `APP_CORS_ORIGIN` includes `:5174` if you ever hit Vite directly.

### Quality

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm build
```

### Verify

Login as `dashboard@example.com` / `12345678` → `/app` shows Products / Articles / Vue tiles; open an app to see the nested drawer. Admin user also sees Admin. Empty drawer after `make up` on an old volume: `make migrate && make seed`.

### Related

- Hub: [docs/local-development-guide.md](../docs/local-development-guide.md)
- Gateway: [gateway/README.md](../gateway/README.md)

## Repo structure

```
shell/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── context/RemoteContext.tsx
    ├── context/NavContext.tsx
    ├── auth/Gate.tsx
    ├── layout/ShellLayout.tsx
    ├── layout/AppLauncherGrid.tsx
    ├── layout/AppsPopover.tsx
    ├── layout/NavTree.tsx
    └── pages/
        ├── HomeLauncher.tsx
        ├── RemoteOutlet.tsx
        ├── NotFound.tsx
        └── Unsupported.tsx
```

## Vite / federation notes

- **`remotes: {}`** in `vite.config.ts` is intentional — remotes are registered at
  runtime from the `accessible` API response, not hardcoded here.
- Shared singletons: `react`, `react-dom`, `@mfe/sdk`, `@mui/material`, `@emotion/*`.
- `@module-federation/vite` is pinned at `1.22.0` (with `@module-federation/enhanced@2.9.0`). **Do not bump** without regression testing.

## Remote contract

```ts
export interface RemoteModule {
  mount(el: HTMLElement, ctx: { basePath: string; routeName: string; locale?; onNotify? }): void | Promise<void>;
  unmount(): void | Promise<void>;
}
```

- `basePath` = `/app/<routeName>`
- **No token, no user object** — remotes use `import { api } from '@mfe/sdk'`
- Hosted exposes must **not** wrap SessionGate (shell `Gate` owns session)

## Error handling

| Scenario | Behaviour |
|----------|-----------|
| Boot `refresh()` 401 | Redirect to `/login?next=<path>` |
| `accessible` 4xx/5xx | Redirect to login |
| Unknown `:routeName` | `<NotFound>` — no `loadRemote` |
| Unsupported `framework` | `<Unsupported>` — no `loadRemote` |
| `loadRemote` / `mount` throws | Error panel + Retry; nav stays |
| Empty accessible list | Empty launcher; not an error |
| Logout | `logout()` → `/login` |
