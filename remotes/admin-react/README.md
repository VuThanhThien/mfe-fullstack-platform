# @mfe/admin-react

Federation remote for ADMIN CRUD of users, scopes, and MfeConfigs.

| Concern | Value |
|---------|-------|
| Federation name | `adminReact` |
| Exposed module | `./App` → `{ mount, unmount }` |
| Vite base (dev) | `/` |
| Vite base (build) | `/r/admin-react/` |
| Dev port | `5176` |
| Shell route | `/app/admin` (`routeName=admin`) |
| Standalone routes | `/`, `/users`, `/scopes`, `/configs`, … |

## Contract

- Mount receives `{ basePath, routeName, onNotify? }` from the shell.
- SoftGate decodes JWT `scopes` for UX only; Nest `@RequireScopes(ADMIN)` is authz.
- HTTP via `api` from `@mfe/sdk` only — never `import axios`.
- Forms: react-hook-form + zod + MUI.
- **Dual-mode:** `expose.tsx` has no SessionGate; `main.tsx` wraps `AdminApp` with `@mfe/ui/auth` SessionGate + LoginForm.

## Local (backend + this remote only)

```bash
# Backend on :3000 (Docker compose or host)
. ../../.dev-bin/env.sh
pnpm install
pnpm dev
```

Open **http://localhost:5176/** — SessionGate → login as `admin@example.com` /
`12345678` → Admin nested routes under `/` (e.g. `/users`, `/scopes`, `/configs`).

Hosted path remains `http://localhost:8080/app/admin` via shell + gateway.
