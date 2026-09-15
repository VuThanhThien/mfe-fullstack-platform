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
make infra && cd backend && pnpm start:dev
cd remotes/demo-react && pnpm install && pnpm dev
```

Standalone SessionGate mounts **Product** only (`basename=/`).

## Build / Docker

```bash
pnpm build   # base=/r/demo-react/
```

After pull: `make seed` (replaces legacy `demo` row with `product` + `article`).

## Data

Catalog pages use **`@tanstack/react-query`** over fixture async loaders (no raw `fetch` / axios in the app).
