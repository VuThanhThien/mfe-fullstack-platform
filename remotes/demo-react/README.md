# @mfe/demo-react

Demo React remote for the MFE platform. Loaded by the shell via Module Federation 2.

## Role

Proves the `@mfe/sdk` singleton contract:

- Shell boots, calls `refresh()` → access token in memory
- Shell registers `demoReact` remote from `accessible` API response
- Shell calls `loadRemote(item)` → `{ mount, unmount }`
- `mount(el)` renders this component into the shell outlet
- Component calls `api.get('/api/v1/users/me')` — no token passed; the SDK singleton already has it
- `unmount()` on nav-away cleans up React root

## Exposed module

| Entry | Export |
|-------|--------|
| `./App` → `src/expose.tsx` | `{ mount(el), unmount() }` |

Build output (via Caddy): **`/r/demo-react/remoteEntry.js`**. The SDK's `toRuntimeEntry()` rewrites that to
**`/r/demo-react/mf-manifest.json`**, and the manifest URL is what the seeded `MfeConfig.remoteEntry` points at —
loading the raw `remoteEntry.js` as a classic script is what triggers runtime error `RUNTIME-008`.

## Dev

```bash
# Install
pnpm install

# Dev server (port 5175)
pnpm dev

# Type check
pnpm typecheck

# Production build
pnpm build
```

> **Note:** In the happy path you access this via Caddy on `:8080`, not directly on `:5175`.

## Standalone preview

`index.html` uses `src/main.tsx` for isolated preview of `DemoApp`. This renders `DemoApp` directly — the `api.get` call will return 401 unless you have a valid backend session.

## Locked versions

| Package | Version |
|---------|---------|
| react / react-dom | `^18.3.1` |
| `@module-federation/vite` | **`1.16.6`** |
| `@mui/material` | `^6.1.0` |
| vite | `^5.4.0` |

## Config alignment

`name: 'demoReact'` must match the `remoteName` column in the backend seed (`mfe-config` table). If the seed changes, update `vite.config.ts` accordingly.
