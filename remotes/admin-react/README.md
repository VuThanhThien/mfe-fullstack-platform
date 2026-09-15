# @mfe/admin-react

Federation remote for ADMIN CRUD of users, scopes, and MfeConfigs.

| Concern | Value |
|---------|-------|
| Federation name | `adminReact` |
| Exposed module | `./App` → `{ mount, unmount }` |
| Vite base | `/r/admin-react/` |
| Dev port | `5176` |
| Shell route | `/app/admin` (`routeName=admin`) |

## Contract

- Mount receives `{ basePath, routeName }` from the shell.
- SoftGate decodes JWT `scopes` for UX only; Nest `@RequireScopes(ADMIN)` is authz.
- HTTP via `api` from `@mfe/sdk` only — never `import axios`.
- Forms: react-hook-form + zod + MUI.

## Local

```bash
. ../../.dev-bin/env.sh
pnpm install
pnpm dev
```

Happy path is via the gateway at `http://localhost:8080/app/admin` after admin login.

## Standalone SessionGate

**Deferred.** Dual-mode auth (Spec A) is proven on the product remote
(`remotes/demo-react`). When needed, copy that pattern: Vite `/api` proxy,
`setRedirectPolicy('standalone')`, `@mfe/ui/auth` SessionGate + LoginForm wrapping
`AdminApp`; keep `expose.tsx` free of SessionGate.
