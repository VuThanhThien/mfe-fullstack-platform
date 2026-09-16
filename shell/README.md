# shell

Authenticated React host for the MFE platform.

**Shipped** (Phase C, P5) — mounts `framework: 'react' | 'vue'`.

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

Login as `dashboard@example.com` / `12345678` → nav shows Products / Articles / Vue; admin user sees Admin.

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
    ├── auth/Gate.tsx
    ├── layout/ShellLayout.tsx
    └── pages/
        ├── RemoteOutlet.tsx
        ├── NotFound.tsx
        └── Unsupported.tsx
```

## Vite / federation notes

- **`remotes: {}`** in `vite.config.ts` is intentional — remotes are registered at
  runtime from the `accessible` API response, not hardcoded here.
- Shared singletons: `react`, `react-dom`, `@mfe/sdk`, `@mui/material`, `@emotion/*`.
- `@module-federation/vite` is pinned at `1.16.6`. **Do not bump** without regression testing.

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
| Empty accessible list | Empty state; not an error |
| Logout | `logout()` → `/login` |
