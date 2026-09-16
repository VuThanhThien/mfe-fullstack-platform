# Demo Vue Remote (`demoVue`)

Federation remote proving Vue 3 + `{ mount, unmount }` on `@module-federation/vite@1.16.6`.

| | |
|--|--|
| Port | **5177** |
| Gateway | `/r/demo-vue/` |
| `remoteName` | `demoVue` |
| Expose | `./App` |
| Seed `routeName` | `vue` (scopes `[DASHBOARD]`) |

## Local

```bash
. ../../.dev-bin/env.sh
pnpm install
pnpm dev          # http://localhost:5177 — unauth redirects to platform login
pnpm typecheck
pnpm build        # assets under /r/demo-vue/
```

**Hosted DX (primary):** shell at `http://localhost:8080/app/vue` after `make seed` + gateway + shell Vue outlet.

**Standalone:** Mode C — `refresh()` then mount, else redirect to `VITE_PUBLIC_LOGIN_URL` (default `http://localhost:8080/login`). No Vue LoginForm. Cookie on `:5177` after landing login usually fails without `COOKIE_DOMAIN` (accepted).

## Features

- Tailwind v4 dashboard — Overview / Analytics / Reports / Notifications
- Hosted router = `createMemoryHistory` (no fight with React Router)
- Theme sync: `mfe-ui-mode` + `mfe-ui:mode` (mirrors `@mfe/ui`; no `@mfe/ui` dep)
- Overview: `api.get('/api/v1/users/me')` via `@mfe/sdk`

## Constraints

- Never `import axios` — use `@mfe/sdk`
- Mount ctx unchanged (no token)
- Pin `@module-federation/vite@1.16.6`
