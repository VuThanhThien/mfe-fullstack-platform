# Scout Report — Vue Remote D1–D2 Wiring

**Repo:** `/Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026`  
**Thoroughness:** medium  
**Date:** 2026-09-15  
**Purpose:** Locate shell/gateway/seed/Docker patterns a Vue remote must mirror or extend.

---

## 1. Shell RemoteOutlet framework guard + ReactRemote mount

**File:** `shell/src/pages/RemoteOutlet.tsx`

Decision tree (lines 3–7, 38–57):

| Condition | Outcome |
|-----------|---------|
| `routeName` not in `accessibles` | `<NotFound>` |
| `item.framework !== 'react'` | `<Unsupported framework={…}>` — **no** `loadRemote` |
| `framework === 'react'` | `<ReactRemote item={item} />` |

Guard (exact):

```51:57:shell/src/pages/RemoteOutlet.tsx
  // ── Guard: non-React framework ────────────────────────────────────────────
  if (item.framework !== 'react') {
    return <Unsupported framework={item.framework} />;
  }

  // ── React remote ──────────────────────────────────────────────────────────
  return <ReactRemote item={item} />;
```

**ReactRemote mount pattern** (`shell/src/pages/RemoteOutlet.tsx` L61–118):

1. Stable `containerRef` `<div>` always in DOM.
2. `useEffect` → `loadRemote(item)` → `remote.mount(el, { basePath: `/app/${routeName}`, routeName, locale, onNotify })`.
3. Cleanup: set `cancelled`, call `unmountFn` / in-flight `remote.unmount()`.
4. Deps: `[item.routeName, item.remoteEntry, retryKey]` (notify via `useEventCallback`).
5. Error → Alert + Retry (increments `retryKey`); loading overlay while `phase === 'loading'`.

**Unsupported UI:** `shell/src/pages/Unsupported.tsx` L1–7 — Vue/Angular wrappers “later phase”; intentionally does not call `loadRemote`.

**SDK contract:** `packages/mfe-sdk/src/types.ts` L24–40 — `{ mount, unmount }` + `RemoteMountContext` (no token/user/event bus).

**D1–D2 implication:** Vue needs either a new `VueRemote` branch alongside the react guard, or the guard must accept `framework === 'vue'` and mount via a Vue-compatible loader. Backend already allows `'vue'` in `MFE_FRAMEWORKS` (see §5).

---

## 2. mfe-ui-mode theme toggle (shell + `@mfe/ui`)

### Storage + events (`packages/mfe-ui/src/mode.ts`)

| Constant | Value | Role |
|----------|-------|------|
| `MODE_KEY` | `'mfe-ui-mode'` | `localStorage` key (`'light'` \| `'dark'`) |
| `MODE_EVENT` | `'mfe-ui:mode'` | Same-tab `CustomEvent` name; `detail` = mode |

API:

- `getMode()` — localStorage → memory fallback; corrupt → `'light'`
- `setMode(mode)` — memory + `localStorage.setItem(MODE_KEY)` + `window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }))`
- `subscribeMode(cb)` — listens to `MODE_EVENT` **and** cross-tab `storage` (filters `event.key === MODE_KEY`)

Exports: `packages/mfe-ui/src/index.ts` L1–2.

### Shell wiring

| File | Role |
|------|------|
| `shell/src/theme/use-theme-mode.ts` | `useState(getMode)` + `useEffect(() => subscribeMode(setModeState))` |
| `shell/src/App.tsx` L17–21 | `createTheme(mode)` from `@mfe/ui` → `ThemeProvider` |
| `shell/src/layout/ShellLayout.tsx` L71–73, L193–202 | `handleToggleMode` → `setMode(light↔dark)`; IconButton `data-testid="theme-mode-toggle"` |

**Note:** Preference-only localStorage — not auth tokens (commented in both packages).

**D1–D2 implication:** A Vue remote that wants theme sync should read `MODE_KEY` / subscribe to `MODE_EVENT` (or share `@mfe/ui` if Vue-compatible); shell does not push theme into `RemoteMountContext`.

---

## 3. demo-react expose mount/unmount pattern

**No single `expose.tsx`** — multi-surface via `src/exposes/`:

| Expose | File | App component |
|--------|------|---------------|
| `./Product` | `remotes/demo-react/src/exposes/product.tsx` | `ProductApp` |
| `./Article` | `remotes/demo-react/src/exposes/article.tsx` | `ArticleApp` (same module as Product) |

**Pattern** (product.tsx L5–16; article mirrors):

```ts
let root: Root | null = null; // per-expose module-level; do NOT share across exposes

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<ProductApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
```

**Federation** (`remotes/demo-react/vite.config.ts` L17–23):

- `name: 'productReact'`
- `exposes: { './Product': …, './Article': … }`
- `base: '/r/demo-react/'` on build; `/` on dev
- shared: react, react-dom, `@mfe/sdk`, RHF, RQ, MUI, emotion

**Admin single-expose contrast:** `remotes/admin-react/src/expose.tsx` — same mount/unmount root pattern; vite exposes `./App` as `adminReact`.

---

## 4. Dockerfile + package.json federation / `file:` `@mfe/sdk`

### package.json pattern (both remotes)

**demo-react** `remotes/demo-react/package.json` L16–17, L18, L31:

- `"@mfe/sdk": "file:../../packages/mfe-sdk"`
- `"@mfe/ui": "file:../../packages/mfe-ui"`
- dep: `@module-federation/enhanced` `^0.6.0`
- pinned: `@module-federation/vite` `1.16.6`

**admin-react** `remotes/admin-react/package.json` — same `file:` + federation pins.

### Dockerfile pattern (repo-root build context)

Both `remotes/demo-react/Dockerfile` and `remotes/admin-react/Dockerfile`:

1. Node `20.18.0` + global `pnpm@9.12.3`
2. `COPY packages/mfe-sdk` → `pnpm install --frozen-lockfile --prod` **in SDK** (axios must resolve)
3. `COPY packages/mfe-ui` → prod install + peer `pnpm add` (react/MUI/RHF/zod)
4. Copy remote `package.json` + lockfile → `pnpm install --frozen-lockfile`
5. Copy remote sources → `pnpm build` (builder) → Caddy alpine serves `dist` with `Caddyfile.static`
6. Dev stage ports: demo **5175**, admin **5176**

**D1–D2 implication:** Vue remote Dockerfile should copy SDK (and UI if used), install SDK prod deps in place, then link via `file:` — same monorepo root context.

---

## 5. MfeConfig seeder upsert pattern

**File:** `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts`

**Framework enum (backend):** `MFE_FRAMEWORKS = ['react', 'vue', 'angular']` — `backend/src/api/mfe-config/dto/create-mfe-config.req.dto.ts` L4–5.

**Upsert** (`upsertMfeConfig`, L121–149):

1. `findOne({ where: { routeName }, relations: { scopes: true } })`
2. Missing → `save(new MfeConfigEntity({ …seed, createdBy/updatedBy: SYSTEM_USER_ID }))`
3. Existing → overwrite `remoteEntry`, `remoteName`, `exposedModule`, `title`, `framework`, `scopes`, `updatedBy` → `save`
4. Idempotent by **`routeName`** (not remoteName)
5. Pre-upsert: `delete({ routeName: 'demo' })` (legacy)

**Current seeds** (L72–99):

| routeName | remoteName | exposedModule | path | scopes |
|-----------|------------|---------------|------|--------|
| `product` | `productReact` | `./Product` | `/r/demo-react/mf-manifest.json` | DASHBOARD |
| `article` | `productReact` | `./Article` | same | DASHBOARD |
| `admin` | `adminReact` | `./App` | `/r/admin-react/mf-manifest.json` | ADMIN |

`PUBLIC_GATEWAY_URL` default `http://localhost:8080`.

---

## 6. Gateway Caddyfile* remote routes + docker-compose services

### Caddy remote handles (all three variants)

| File | Upstream style | Remote routes |
|------|----------------|---------------|
| `gateway/Caddyfile` | host Vite | `/r/demo-react*` → `:5175`; `/r/admin-react*` → `:5176` |
| `gateway/Caddyfile.docker` | `host.docker.internal` | same paths → `:5175` / `:5176` |
| `gateway/Caddyfile.compose` | compose DNS | `/r/demo-react*` → `demo-react:80`; `/r/admin-react*` → `admin-react:80` |

Also in each: `/api*` → backend, `/app*` → shell, catch-all → landing. Compose adds `redir /app /app/ 308`.

### docker-compose.yml remote services (L113–147)

```yaml
demo-react:   build context ., dockerfile remotes/demo-react/Dockerfile, target production
admin-react:  build context ., dockerfile remotes/admin-react/Dockerfile, target production
gateway:      mounts gateway/Caddyfile.compose; depends_on includes both remotes
```

Ports: gateway `${GATEWAY_HOST_PORT:-8080}:80`. Remotes not published on host; only via gateway `/r/…`.

**D1–D2 implication:** Add `/r/demo-vue*` (or chosen slug) to **all three** Caddyfiles + a compose service + gateway `depends_on`.

---

## 7. Makefile smoke targets

**Single smoke target:** `Makefile` L105–118 (`smoke`).

Checks:

1. `GET /` — status line
2. `GET /api/docs` — status line
3. `GET /app/` — status line
4. `GET /r/demo-react/remoteEntry.js` — status line
5. `GET /r/demo-react/mf-manifest.json` — **must** `Content-Type: application/json` (fail loud if HTML fallback)
6. `GET /r/admin-react/mf-manifest.json` — same JSON check
7. `GET http://localhost:3000/health` — direct backend

No separate `smoke-*` targets. No Vue remote covered yet.

---

## 8. Does shell filter nav by `framework === 'react'` only?

**No.** Nav lists **all** `accessibles` without a framework filter.

Evidence:

- `shell/src/layout/ShellLayout.tsx` L103–116 — `accessibles.map((item) => …)` for drawer links; no `framework` check.
- `shell/src/auth/Gate.tsx` — boots with full `GET /api/v1/mfe-configs/accessible` list.
- Framework gate is **outlet-only** (`RemoteOutlet` → `Unsupported`).

**D1–D2 implication:** Seeding a `framework: 'vue'` config will show it in nav immediately; clicking it hits Unsupported until shell gains a Vue mount path.

---

## Relevant files (index)

| Path | Why |
|------|-----|
| `shell/src/pages/RemoteOutlet.tsx` | React-only guard + mount lifecycle |
| `shell/src/pages/Unsupported.tsx` | Non-react placeholder |
| `shell/src/layout/ShellLayout.tsx` | Nav (no framework filter) + theme toggle |
| `shell/src/theme/use-theme-mode.ts` | Theme subscription hook |
| `packages/mfe-ui/src/mode.ts` | `mfe-ui-mode` / `mfe-ui:mode` |
| `remotes/demo-react/src/exposes/{product,article}.tsx` | Mount/unmount contract |
| `remotes/demo-react/vite.config.ts` | Federation exposes + shared |
| `remotes/admin-react/src/expose.tsx` | Single-expose variant |
| `remotes/{demo,admin}-react/{Dockerfile,package.json}` | `file:` SDK + Docker build |
| `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts` | Upsert-by-routeName |
| `backend/src/api/mfe-config/dto/create-mfe-config.req.dto.ts` | `vue` already in enum |
| `gateway/Caddyfile{,.docker,.compose}` | `/r/*` reverse_proxy |
| `docker-compose.yml` | Remote services + gateway deps |
| `Makefile` | `smoke` JSON manifest checks |
| `packages/mfe-sdk/src/{remote,types}.ts` | `loadRemote` + contract |

---

## Gaps / unresolved for Vue D1–D2

1. **Shell has no Vue mount branch** — only `framework === 'react'` proceeds to `loadRemote`.
2. **No Vue remote folder, Caddy route, compose service, seed row, or smoke check** exists yet.
3. **Theme is not passed in mount ctx** — Vue remote must subscribe to `@mfe/ui` mode events or reimplement if not sharing the package.
4. **Federation shared map is React-centric** — Vue remote will need its own shared (`vue`, etc.); `@mfe/sdk` singleton still applies.
5. Backend **already accepts** `framework: 'vue'` — seeder/API ready; shell/runtime not.

---

## Key findings (bullets)

- Outlet gates on `framework !== 'react'` → Unsupported; mount only for React via `loadRemote` + `{ basePath, routeName, locale, onNotify }`.
- Theme: `localStorage['mfe-ui-mode']` + CustomEvent `'mfe-ui:mode'` + cross-tab `storage`; shell toggles via `setMode`.
- demo-react: per-expose module-level React root (`product.tsx` / `article.tsx`); admin: single `expose.tsx`.
- Docker: root context, install SDK prod in place, `file:../../packages/mfe-sdk`, pin `@module-federation/vite@1.16.6`.
- Seeder upserts by `routeName`; `vue` is already a valid `MfeFramework`.
- Gateway: three Caddyfiles all proxy `/r/demo-react*` and `/r/admin-react*` only.
- `make smoke` validates both React remote manifests as JSON.
- **Nav does not filter by framework** — Vue configs would appear in drawer before shell can mount them.
