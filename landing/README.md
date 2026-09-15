# landing

Public marketing page + auth flows for the MFE platform.

## Routes

| Path        | Description                                          |
|-------------|------------------------------------------------------|
| `/`         | Home — always public, never auto-redirects           |
| `/login`    | Shared `@mfe/ui` LoginForm + SessionGate             |
| `/register` | Register form — sends to `/login` on success         |

## Local (backend + landing)

```bash
make infra
cd backend && pnpm start:dev

cd landing
npm install
npm run dev                 # :5173, proxy /api → :3000
```

Open `http://localhost:5173/login`.

## Docker / integrated

`make up` builds **production** static images behind gateway `:8080` (no Vite HMR).

## Auth

1. **Login** — `@mfe/ui` LoginForm → `@mfe/sdk` `login()`; `safeNext(?next)`.
2. **Register** — no cookie; navigate to `/login`.
3. **SessionGate** — `refresh()` on mount; valid cookie skips the form.

## Security

- Access token: **memory only**.
- Refresh token: **HttpOnly cookie**.
- Open-redirect: `safeNext()` only allows `^/app(/.*)?$`.
