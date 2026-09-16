# landing

Public marketing page + auth flows for the MFE platform.

## Routes

| Path        | Description                                          |
|-------------|------------------------------------------------------|
| `/`         | Home — always public, never auto-redirects           |
| `/login`    | Shared `@mfe/ui` LoginForm + SessionGate             |
| `/register` | Register form — sends to `/login` on success         |

## Local development

### Prerequisites

- `. .dev-bin/env.sh` (Node 20.18.0)
- Backend on `:3000` (`make infra` + `pnpm start:dev` in `backend/`)
- Install `packages/mfe-sdk` and `packages/mfe-ui` first (`file:` deps)

### Install

```bash
cd packages/mfe-sdk && pnpm install
cd ../mfe-ui && pnpm install
cd ../../landing && npm install   # npm, not pnpm
```

### Env

None required. Vite proxies `/api` → `http://localhost:3000`. Leave `COOKIE_DOMAIN` unset.

### Run (standalone / hosted)

```bash
npm run dev                 # :5173
```

- **Standalone (Spec A):** `http://localhost:5173/login`
- **Hosted:** via gateway `http://localhost:8080/` (`make up` or host Caddy)

`make up` serves **production** static (no Vite HMR).

### Ports & origins

| Mode | URL |
|------|-----|
| Dev | `http://localhost:5173` |
| Gateway | `http://localhost:8080/` |

### Quality

```bash
npm run typecheck
npm run lint
npm run format
npm run format:check
npm run build
```

No unit test script in this package.

### Verify

Open `/login`, sign in with a seed user, confirm redirect respects `safeNext(?next)`.

### Related

- Hub: [docs/local-development-guide.md](../docs/local-development-guide.md)
- Auth UI: `@mfe/ui/auth` · SDK: `@mfe/sdk`

## Auth

1. **Login** — `@mfe/ui` LoginForm → `@mfe/sdk` `login()`; `safeNext(?next)`.
2. **Register** — no cookie; navigate to `/login`.
3. **SessionGate** — `refresh()` on mount; valid cookie skips the form.

## Security

- Access token: **memory only**.
- Refresh token: **HttpOnly cookie**.
- Open-redirect: `safeNext()` only allows `^/app(/.*)?$`.
