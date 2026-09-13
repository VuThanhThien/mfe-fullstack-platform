# landing

Public marketing page + auth flows for the MFE platform.

## Routes

| Path        | Description                                          |
|-------------|------------------------------------------------------|
| `/`         | Home — always public, never auto-redirects           |
| `/login`    | Login form — refreshes session on mount if cookie present |
| `/register` | Register form — sends to `/login` on success         |

## Ports

| Service   | Port  | Notes                                  |
|-----------|-------|----------------------------------------|
| Vite dev  | 5173  | Internal; do not use directly          |
| Caddy     | 8080  | **Use this** — forwards `/` and `/login`, `/register` here |

## Setup

```bash
npm install
npm run dev       # Vite on :5173 — access via :8080 through Caddy
npm run build     # Type-check + production bundle
npm run typecheck # Type-check only
```

> **Access via `:8080`** — Vite runs on `:5173` but all browser traffic must
> go through the Caddy gateway at `http://localhost:8080`. HMR is configured
> to use `clientPort: 8080` so hot-reload works through the proxy.

## Caddy (gateway)

The Caddyfile (see `gateway/`) proxies:

```
http://localhost:8080/          → http://localhost:5173
http://localhost:8080/login     → http://localhost:5173
http://localhost:8080/register  → http://localhost:5173
http://localhost:8080/api/*     → http://localhost:3000
http://localhost:8080/app/*     → http://localhost:5174  (shell)
```

## Auth flow

1. **Login** — `@mfe/sdk` `login()` hits `/api/v1/auth/email/login`.
   Backend sets `refresh_token` HttpOnly cookie. Access token stored in memory.
   Landing redirects to `safeNext(?next)` or `/app`.

2. **Register** — `register()` returns `{ userId }` only (no cookie).
   Landing redirects to `/login` for explicit sign-in.

3. **Session check on /login mount** — `refresh()` with cookie → already-authed
   users skip the form and go to `/app`.

## SDK dependency

```json
"@mfe/sdk": "file:../packages/mfe-sdk"
```

The SDK is resolved from `packages/mfe-sdk` relative to the umbrella root.
`vite.config.ts` sets `server.fs.allow: ['..']` to allow cross-package imports.

## Security notes

- Access token: **memory only** — never written to `localStorage`/`sessionStorage`.
- Refresh token: **HttpOnly cookie** — JS never reads it; browser sends automatically.
- Open-redirect: `safeNext()` only allows `^/app(/.*)?$`; anything else falls back to `/app`.
