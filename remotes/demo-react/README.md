# @mfe/demo-react (product / article bundle)

Deployable remote proving Spec B hybrid multi-surface. Folder path may stay
`demo-react` / `/r/demo-react` until an optional rename.

## Federation

| Expose | File | Shell `routeName` |
|--------|------|-------------------|
| `./Product` | `src/exposes/product.tsx` | `product` |
| `./Article` | `src/exposes/article.tsx` | `article` |

`name: 'productReact'` must match seed `remoteName`. Each expose has its **own** root.

## Routing

Hosted + standalone use `SyncedMemoryRouter` from `@mfe/sdk/react-router` (`basePath` from mount / `"/"` standalone). **MUST NOT** nest `BrowserRouter` under the shell. See frontend standards §2.3.2.

## Local development

### Prerequisites

- `. .dev-bin/env.sh`
- Backend on `:3000` (`make infra` + Nest)
- Install `packages/mfe-sdk` + `packages/mfe-ui` first

### Install

```bash
cd packages/mfe-sdk && pnpm install
cd ../mfe-ui && pnpm install
cd ../../remotes/demo-react && pnpm install
```

### Env

None required. Vite proxies `/api` → `:3000`. Leave `COOKIE_DOMAIN` unset. CORS must allow `:5175`.

### Run (standalone / hosted)

```bash
pnpm dev
```

- **Standalone (Spec A):** `http://localhost:5175/` — SessionGate → Product tree under `/`
- **Hosted:** `http://localhost:8080/app/product` and `/app/article` (shell + gateway)

Article hub is shell-nav only when hosted.

### Ports & origins

| Mode | URL |
|------|-----|
| Dev | `http://localhost:5175` |
| Gateway assets | `/r/demo-react*` |
| Shell routes | `/app/product`, `/app/article` |

### Quality

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm build          # base=/r/demo-react/
```

### Verify

Login `dashboard@example.com` / `12345678` on standalone; after pull run `make seed` if DB still has legacy `demo` row.

### Related

- Hub: [docs/local-development-guide.md](../../docs/local-development-guide.md)

## Data

Catalog pages use **`@tanstack/react-query`** over fixture async loaders (no raw `fetch` / axios in the app).
