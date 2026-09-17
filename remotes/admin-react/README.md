# @mfe/admin-react

Federation remote for ADMIN CRUD of users, scopes, MfeConfigs, and per-config nav trees.

| Concern | Value |
|---------|-------|
| Federation name | `adminReact` |
| Exposed module | `./App` → `{ mount, unmount }` |
| Vite base (dev) | `/` |
| Vite base (build) | `/r/admin-react/` |
| Dev port | `5176` |
| Shell route | `/app/admin` (`routeName=admin`) |
| Standalone routes | `/`, `/users`, `/scopes`, `/configs`, `/configs/:id/nav`, … |

## Contract

- Mount receives `{ basePath, routeName, onNotify? }` from the shell.
- SoftGate decodes JWT `scopes` for UX only; Nest `@RequireScopes(ADMIN)` is authz.
- HTTP via `api` from `@mfe/sdk` only — never `import axios`.
- Forms: react-hook-form + zod + MUI.
- Config create/edit: optional HTTPS `iconUrl`.
- Nav editor: `configs/:id/nav` — nested `group` \| `route` nodes, per-node scopes, reorder. Calls ADMIN `/api/v1/mfe-configs/:id/nav-items` (+ `PATCH …/reorder`).
- **Do not** add a second AppBar/Drawer — shell owns chrome.
- **Routing:** `SyncedMemoryRouter` from `@mfe/sdk/react-router` (`basePath` from mount; standalone uses `"/"`). **MUST NOT** nest `BrowserRouter` under shell.
- **Dual-mode:** `expose.tsx` has no SessionGate; `main.tsx` wraps `AdminApp` with `@mfe/ui/auth` SessionGate + LoginForm.

## Local development

### Prerequisites

- `. .dev-bin/env.sh` (from repo root)
- Backend on `:3000`
- Install `packages/mfe-sdk` + `packages/mfe-ui` first

### Install

```bash
cd packages/mfe-sdk && pnpm install
cd ../mfe-ui && pnpm install
cd ../../remotes/admin-react && pnpm install
```

### Env

None required. Vite `/api` proxy. CORS must allow `:5176`.

### Run (standalone / hosted)

```bash
pnpm dev
```

- **Standalone:** `http://localhost:5176/` — login `admin@example.com` / `12345678`
- **Hosted:** `http://localhost:8080/app/admin`

### Ports & origins

| Mode | URL |
|------|-----|
| Dev | `http://localhost:5176` |
| Gateway assets | `/r/admin-react*` |
| Shell | `/app/admin` |

### Quality

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm build
```

### Verify

Standalone login → `/users`, `/scopes`, `/configs` load without 401. Open a config → **Nav** → add a `route` node. Hosted: `/app/admin` shows the nested shell drawer (seeded Registry group).

### Related

- Hub: [docs/local-development-guide.md](../../docs/local-development-guide.md)
