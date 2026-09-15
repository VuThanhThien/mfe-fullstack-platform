# @mfe/demo-react (product / article bundle)

Deployable remote proving Spec B hybrid multi-surface. Folder path may stay
`demo-react` / `/r/demo-react` until an optional rename.

## Federation

| Expose | File | Shell `routeName` |
|--------|------|-------------------|
| `./Product` | `src/exposes/product.tsx` | `product` |
| `./Article` | `src/exposes/article.tsx` | `article` |

`name: 'productReact'` must match seed `remoteName`. Each expose has its **own** root.

## Local (backend + this remote)

```bash
make infra && cd backend && pnpm start:dev   # or Docker backend on :3000
cd remotes/demo-react && pnpm install && pnpm dev
```

Open **http://localhost:5175/** — SessionGate → login → Product nested routes
under `/` (`/`, `/categories`, `/:productId`, …). Article hub is shell-nav only
(`http://localhost:8080/app/article`).

## Build / Docker

```bash
pnpm build   # base=/r/demo-react/
```

After pull: `make seed` (replaces legacy `demo` row with `product` + `article`).

## Data

Catalog pages use **`@tanstack/react-query`** over fixture async loaders (no raw `fetch` / axios in the app).
