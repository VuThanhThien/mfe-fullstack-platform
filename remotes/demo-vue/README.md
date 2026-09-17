# Demo Vue Remote (`demoVue`)

Federation remote proving Vue 3 + `{ mount, unmount }` on `@module-federation/vite@1.16.6`.

| | |
|--|--|
| Port | **5177** |
| Gateway | `/r/demo-vue/` |
| `remoteName` | `demoVue` |
| Expose | `./App` |
| Seed `routeName` | `vue` (scopes `[DASHBOARD]`) |

## Local development

### Prerequisites

- `. .dev-bin/env.sh`
- Backend on `:3000` (`make infra` + Nest) for Spec A / API calls
- Install `packages/mfe-sdk` first (no `@mfe/ui` — Vue uses local auth UI)

### Install

```bash
cd packages/mfe-sdk && pnpm install
cd ../../remotes/demo-vue && pnpm install
```

### Env

None required. Vite proxies `/api` → `:3000`. Leave `COOKIE_DOMAIN` unset. CORS must allow `:5177`.

### Run (standalone / hosted)

```bash
pnpm dev          # http://localhost:5177
```

- **Hosted (primary):** `http://localhost:8080/app/vue` — shell Gate owns session; expose has **no** SessionGate
- **Standalone (dual-mode):** local `src/auth/SessionGate` + Tailwind `LoginForm`; `setRedirectPolicy('standalone')`

### Ports & origins

| Mode | URL |
|------|-----|
| Dev | `http://localhost:5177` |
| Gateway assets | `/r/demo-vue*` |
| Shell | `/app/vue` |

### Quality

```bash
pnpm typecheck    # vue-tsc
pnpm lint
pnpm format
pnpm format:check
pnpm build        # assets under /r/demo-vue/
```

### Verify

Standalone: login `dashboard@example.com` / `12345678` → dashboard. Hosted: same user via shell nav **Vue**.

### Related

- Hub: [docs/local-development-guide.md](../../docs/local-development-guide.md)

## Features

- Tailwind v4 dashboard — Overview / Analytics / Reports / Notifications
- Hosted router = `createMemoryHistory` (URL-synced under `/app/vue/*` = TODO)
- React remotes use `SyncedMemoryRouter` from `@mfe/sdk/react-router` — **N/A for Vue**; do not import that subpath here
- Theme sync: `mfe-ui-mode` + `mfe-ui:mode` (mirrors `@mfe/ui`; no `@mfe/ui` dep)
- Overview: `api.get('/api/v1/users/me')` via `@mfe/sdk`
- Standalone auth: local Vue SessionGate (not `@mfe/ui/auth` — React-only)

## Constraints

- Never `import axios` — use `@mfe/sdk`
- Mount ctx unchanged (no token)
- Pin `@module-federation/vite@1.16.6`
- Hosted expose must not wrap SessionGate
