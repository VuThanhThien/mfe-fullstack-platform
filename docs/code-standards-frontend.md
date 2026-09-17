# Frontend Code Standards (React + Vite)

> Part of the code-standards set. Hub and cross-cutting rules: [`docs/code-standards.md`](./code-standards.md).
> Backend: [`code-standards-backend.md`](./code-standards-backend.md) · Frontend: [`code-standards-frontend.md`](./code-standards-frontend.md) · SDK: [`code-standards-sdk.md`](./code-standards-sdk.md)

**Authority:** running code wins — each app's `src/` (landing, shell, remotes/demo-react, remotes/admin-react, remotes/demo-vue) is ground truth for frontend behaviour.

**Siblings:** §1 Backend → [`code-standards-backend.md`](./code-standards-backend.md) · §3 SDK → [`code-standards-sdk.md`](./code-standards-sdk.md) · §4–§6 hub → [`code-standards.md`](./code-standards.md).

---

## 2. Frontend Code Standards (React + Vite)

### 2.1 Project Structure

These are the **complete** source trees — do not invent `components/`, `hooks/`, `types/`,
`utils/` or CSS-module files; they do not exist. Imports are **relative** (`./auth/Gate`,
`../schemas/auth.js`), never `@/…` (see §5.3 in `code-standards.md`).

```
landing/                          # standalone Vite app (npm) — NOT a federation remote
├── src/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── schemas/auth.ts           # zod schemas + inferred form types (§2.9)
│   ├── App.tsx                   # routes: /, /login, /register
│   ├── main.tsx                  # entry: BrowserRouter + ThemeProvider
│   └── theme.ts                  # MUI theme
├── vite.config.ts                # base '/'; no federation plugin
├── tsconfig.json                 # solution file → tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
└── index.html

shell/                            # federation host (pnpm)
├── src/
│   ├── auth/Gate.tsx             # boot guard: refresh → accessible → registerRemotes
│   ├── context/RemoteContext.tsx # RemoteContext + useRemoteContext()
│   ├── context/NavContext.tsx    # lazy per-routeName nav cache (memory only)
│   ├── layout/ShellLayout.tsx    # header Apps + per-app drawer (hidden on /app)
│   ├── layout/AppLauncherGrid.tsx
│   ├── layout/AppsPopover.tsx
│   ├── layout/NavTree.tsx        # nested group | route from API
│   ├── nav/active-leaf.ts        # leaf href + active match
│   ├── pages/
│   │   ├── HomeLauncher.tsx      # /app index — accessible widgets
│   │   ├── NotFound.tsx
│   │   ├── RemoteOutlet.tsx      # lazy mount/unmount of react | vue remotes
│   │   └── Unsupported.tsx       # angular / unknown frameworks
│   ├── App.tsx                   # index → HomeLauncher; :routeName/* → outlet
│   └── main.tsx
├── vite.config.ts                # base '/app/'; remotes: {} (registered at runtime)
├── tsconfig.json                 # solution file → tsconfig.app.json + tsconfig.node.json
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
└── index.html

remotes/demo-react/               # federation remote (pnpm)
├── src/
│   ├── DemoApp.tsx               # the remote's UI
│   ├── expose.tsx                # './App' → { mount, unmount }
│   └── main.tsx                  # standalone dev entry only
├── vite.config.ts                # base '/r/demo-react/'; exposes './App'
├── tsconfig.json                 # single config (no project references here)
├── package.json
└── index.html

remotes/admin-react/              # federation remote — ADMIN CRUD (pnpm, Phase D5 ✓)
├── src/
│   ├── components/               # user/scope/config forms + nav editor
│   ├── pages/configs/            # list/create/edit + ConfigNavPage (`:id/nav`)
│   ├── lib/api/nav-items.ts      # ADMIN nav CRUD via api.*
│   ├── lib/jwt-scopes.ts         # extract scopes from token; SoftGate pattern
│   ├── schemas/nav-item.ts       # group | route + HTTPS iconUrl
│   ├── AdminApp.tsx              # root component; boot guard
│   ├── expose.tsx                # './App' → { mount, unmount }
│   └── main.tsx                  # standalone dev entry only
├── vite.config.ts                # base '/r/admin-react/'; exposes './App'
├── tsconfig.json
├── package.json
└── index.html
```

Each frontend app has its own `tsconfig.json` / `vite.config.ts` / `package.json`; the
root `package.json` is **repo-level dev tooling only** (puppeteer for e2e scripts), defines
**no** `workspaces`, and is not a shared frontend workspace config.

**Build-context hygiene (repo root):** `.dockerignore` excludes a bare `node_modules` **and**
`**/node_modules`. Both forms are required — the bare entry covers the build-context root and
the glob covers nested packages (e.g. `packages/mfe-sdk/node_modules`). Keep both when editing it.

### 2.2 Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| **Page** | `{PageName}.tsx` (PascalCase) | `Login.tsx`, `Dashboard.tsx` |
| **Component** | `{ComponentName}.tsx` (PascalCase) | `Button.tsx`, `NavBar.tsx` |
| **Hook** | `use{HookName}.ts` (camelCase, starts with `use`) | `useAuth.ts`, `useApi.ts` |
| **Type** | `{TypeName}.ts` or `.d.ts` | `auth.ts` exports `AuthState` |
| **Utility** | `{utilityName}.ts` (camelCase) | `validation.ts`, `format.ts` |
| **Style** | MUI `sx` + `@mfe/ui` `createTheme(mode)` in shell/remotes; landing keeps local `theme.ts` until Next.js migration | no CSS-module/`.scss`; do not add one |
| **Test file** | `{artifact}.test.ts(x)` / `.spec.ts(x)` | not used yet — no app has a test runner (§2.6) |

### 2.2.1 Shared UI (`@mfe/ui`)

- Package: `packages/mfe-ui` — **theme + mode I/O + layout kit + presentational widgets**.
- Imports: `@mfe/ui` (theme/mode/layout); `@mfe/ui/widgets` (charts/cards — needs peer `recharts`). Shell must **not** import widgets.
- Feedback (Loader/Empty/Result/Confirm) stays **per-app**.
- Consumers: `shell/`, `remotes/demo-react/`, `remotes/admin-react/`. **Not** `landing/`.
- Mode sync: `localStorage` key `mfe-ui-mode` (`'light'|'dark'` only) + same-tab `CustomEvent` `mfe-ui:mode`. **Never** store access/refresh tokens in `localStorage`.
- Shell owns AppBar toggle (`setMode`) + layout kit wiring; remotes `subscribeMode` and rebuild `createTheme(mode)`.
- Shell owns **nested API nav** (Home launcher + header Apps + per-app drawer). Remotes must **not** add a second AppBar/Drawer (`PageToolbar` is OK). The older dashboard-widgets “no nested sidebar” non-goal is superseded for **shell-owned** API nav only — see §2.3.1.
- `@mfe/ui` is **not** in Module Federation `shared` (v1).
- Specs: `docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md`; `docs/brainstorm/2026-09-14-dashboard-layout-widgets-mfe-ui-spec.md`; shell chrome: `docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`

### 2.3 Component Patterns

**Functional components + hooks (no class components).** Auth flows call the SDK
**directly** — there is no `hooks/useAuth.ts` wrapper in this repo.

```typescript
// landing/src/pages/Login.tsx (abridged) — direct SDK calls + react-hook-form
import { ApiError, login, safeNext } from '@mfe/sdk';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBoolean } from 'usehooks-ts';
import { loginSchema, type LoginForm } from '../schemas/auth.js';   // relative, no @/

const { control, handleSubmit } = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

const { value: isSubmitting, setTrue: startSubmitting, setFalse: stopSubmitting } =
  useBoolean(false);

const onSubmit = handleSubmit(async (values) => {
  try {
    await login(values);                                  // SDK owns the HTTP boundary
    window.location.assign(safeNext(next));               // never trust ?next= raw
  } catch (err) {
    setFormError(err instanceof ApiError ? 'Invalid email or password.' : 'Something went wrong.');
    stopSubmitting();
  }
});
```

**Shell boot sequence — `shell/src/auth/Gate.tsx`:**

```typescript
useEffect(() => {
  let cancelled = false;

  async function boot() {
    try {
      const { userId } = await refresh();                       // hydrates token from cookie
      const { data: items } = await api.get<MfeAccessibleItem[]>(
        '/api/v1/mfe-configs/accessible',                       // payload is res.data
      );
      await registerRemotes(items);                             // runtime MF registration
      if (!cancelled) setState({ status: 'ready', userId, accessibles: items });
    } catch {
      if (cancelled) return;
      // Any boot failure (not just 401) bounces to login
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }

  void boot();
  return () => { cancelled = true; };
}, []);
```

**Context — `shell/src/context/RemoteContext.tsx`.** `useRemoteContext()` **throws** when
used outside the `<Gate>` provider; that is intentional (a missing provider is a bug, not a
`null` to tolerate).

```typescript
export const RemoteContext = createContext<RemoteContextValue | null>(null);

export function useRemoteContext(): RemoteContextValue {
  const ctx = useContext(RemoteContext);
  if (!ctx) throw new Error('useRemoteContext must be called inside a <Gate> provider');
  return ctx;
}
```

#### 2.3.1 Shell chrome — launcher + API nav tree

Shell nav is **not** a flat `accessible` list. Spec:
[`docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`](./brainstorm/2026-09-16-app-launcher-nav-tree-spec.md)
(design intent; **running code** is ground truth).

| Surface | Data | Behaviour |
|---------|------|-----------|
| `/app` Home | `GET /api/v1/mfe-configs/accessible` (optional `iconUrl`) | `HomeLauncher` widget grid. **No** app drawer. |
| Header Apps | Same `accessibles` | Popover grid; pick → `/app/{routeName}` (basename `/app`). |
| `/app/:routeName/*` drawer | Lazy `GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible` | Nested `group` \| `route` tree for **that** config only. |

Rules (locked):

- **1 config = 1 launcher tile = 1 nav tree.** Mount ctx stays `{ basePath, routeName, locale?, onNotify? }` — nav is **not** passed into `mount`.
- Leaf href = `/{routeName}/{path}` (`path` relative, no leading `/`). Hidden nav ≠ ACL; remotes/API still guard.
- `NavContext` caches trees in memory for the session (never `localStorage`). Invalidate when `accessibles` refresh. **404** if the config is not in the caller’s accessible set (no ADMIN bypass).
- Empty `group` after scope filter is omitted server-side. Empty tree → drawer empty state, not an error.
- **Remotes** still must not ship a second full chrome. Admin edits trees at `configs/:id/nav` (`iconUrl` on config forms too).

**Remote mount lifecycle — `shell/src/pages/RemoteOutlet.tsx`.** Guards first, then mount:
unknown `routeName` → `<NotFound routeName=…>`; `framework === 'react' | 'vue'` →
`FederatedRemote` (`loadRemote` → `mount` / `unmount`); anything else →
`<Unsupported framework=…>` (no `loadRemote`). Shell never `import`s `vue` — the Vue
runtime lives in `remotes/demo-vue`. Hosted Vue uses `createMemoryHistory` synced to
`window.location` via `@mfe/sdk` `subscribeLocationChange` / `stripBasePath` (same
guards as React `SyncedMemoryRouter`; do not import the React subpath). Theme syncs via
`mfe-ui-mode` / `mfe-ui:mode`
(no `@mfe/ui` dep in the Vue package). Standalone `:5177` uses local
`src/auth/SessionGate` + `LoginForm` (zod `safeParse`) — not `@mfe/ui/auth`.

```typescript
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  let cancelled = false;
  let unmountFn: (() => void | Promise<void>) | null = null;
  setMountState({ phase: 'loading' });

  void (async () => {
    try {
      const remote = await loadRemote(item);
      if (cancelled) return;
      await remote.mount(el, { basePath: `/app/${item.routeName}`, routeName: item.routeName });
      if (cancelled) { void remote.unmount(); return; }   // navigated mid-mount → clean up now
      unmountFn = () => remote.unmount();
      setMountState({ phase: 'mounted' });
    } catch (err) {
      if (!cancelled) setMountState({ phase: 'error', message: String(err) });
    }
  })();

  return () => {
    cancelled = true;                                     // stale in-flight mounts must not render
    if (unmountFn) { void unmountFn(); unmountFn = null; }
  };
}, [item.routeName, item.remoteEntry, retryKey]);         // retryKey re-runs the effect
```

On failure the outlet renders an error `Alert` **inside the outlet** with a Retry button
(increments `retryKey`); the nav (`ShellLayout`) stays visible so the user can navigate away.

**Rules:**
- Always track a `cancelled` flag around async mount effects, and `unmount()` immediately if
  navigation happened while `mount()` was in flight.
- Expose a **Retry** affordance by re-running the effect (counter in deps), never by
  re-mounting the whole shell.
- Mount context is `{ basePath, routeName, locale?, onNotify? }` — never a token or user object; `onNotify` is Snackbar-only (not refetch).

#### 2.3.2 Hosted remote routing (React)

Spec: [`docs/brainstorm/2026-09-17-synced-memory-router-location-sync.md`](./brainstorm/2026-09-17-synced-memory-router-location-sync.md).

| Surface | Router | Rule |
|---------|--------|------|
| **Shell** | `BrowserRouter basename="/app"` + `ShellHistorySync` | Owns `/app` launcher + `:routeName/*` outlet |
| **Landing** | `BrowserRouter` | Standalone app — **not** a federation remote |
| **Hosted React remotes** | `SyncedMemoryRouter` from `@mfe/sdk/react-router` | MemoryRouter ↔ `window.location` via SDK `location-sync` |
| **Standalone React remotes** | Same `SyncedMemoryRouter` with `basePath="/"` | Do not nest a second BrowserRouter for hosted-capable apps |
| **Hosted Vue** | `createMemoryHistory` + `bindSyncedMemoryLocation` (`remotes/demo-vue/src/routing/`) | Same SDK `location-sync` / `stripBasePath`; never import `@mfe/sdk/react-router` |

**MUST / MUST NOT (React remotes):**

- **MUST** wrap remote routes in `SyncedMemoryRouter` (`basePath` from mount ctx, e.g. `/app/admin`).
- **MUST NOT** nest `BrowserRouter` under the shell (causes URL/UI drift when shell NavTree changes subpaths without remounting the outlet).
- **MUST NOT** patch `history.pushState` / `replaceState` in apps — one patch lives in `@mfe/sdk` (`subscribeLocationChange` / `runWithoutLocationNotify`).
- Shell active-nav sync is **pathname-only**; remotes may still put search/hash on the address bar via `SyncedMemoryRouter`.

**MUST / MUST NOT (Vue remotes):**

- **MUST** sync embedded `createMemoryHistory` with `window.location` using SDK helpers (see `remotes/demo-vue/src/routing/sync-memory-location.ts`).
- **MUST NOT** import `@mfe/sdk/react-router`.
- **MUST NOT** keep a second in-app tab bar that duplicates shell nav leaves for the same paths.

```tsx
import { SyncedMemoryRouter } from '@mfe/sdk/react-router';

<SyncedMemoryRouter basePath={basePath}>
  <Routes>...</Routes>
</SyncedMemoryRouter>
```

#### URL as state

Shareable UI state (current page, active filter, selected tab, search query) belongs in the **URL query string**, not in component memory, so links are bookmarkable, pages survive hard reload, and browser back/forward navigate through the list history.

```tsx
// Read — defensive parse with safe default
const [searchParams, setSearchParams] = useSearchParams();
const raw = Number(searchParams.get('page') ?? '1');
const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;

// Write — only push non-default values; page 1 keeps the URL clean
const goTo = (n: number) => setSearchParams(n > 1 ? { page: String(n) } : {});

// Load — keyed on URL value; URL is the single source of truth
useEffect(() => { void load(page); /* eslint-disable-next-line */ }, [page]);

// After response — clamp out-of-range params (stale bookmark, deleted pages)
if (pageNum > totalPages) goTo(totalPages);

// Prev / Next — write URL only, never call load directly
<Button onClick={() => goTo(page - 1)}>Prev</Button>
<Button onClick={() => goTo(page + 1)}>Next</Button>
```

**Rules:**
- Ephemeral state (open dialog, hover, in-flight form validation) stays in component state — do not pollute the URL.
- **Never** put tokens, credentials, or PII in the URL (CLAUDE.md guarantee #3/#10; browser history, server logs, and CDN cache capture query strings).
- Parse defensively: missing or non-numeric params fall back to a sensible default; values that depend on server data (e.g. `totalPages`) are clamped **after** the response arrives.
- Applied to all three admin list pages: `UsersListPage`, `ScopesListPage`, `ConfigsListPage`.

### 2.4 @mfe/sdk Usage

**In landing (no MF):**

```typescript
import { login, register, logout } from '@mfe/sdk';

// Direct import; not federated
```

**In shell + remotes (MF shared singleton):**

```typescript
// shell/vite.config.ts — every shared entry is singleton + requiredVersion (7 in total).
// There is deliberately NO strictVersion; see §2.8 for the full list.
shared: {
  '@mfe/sdk': { singleton: true, requiredVersion: '^0.1.0' },
  react: { singleton: true, requiredVersion: '^18.3.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
}

// shell/src/auth/Gate.tsx
import { refresh, api, registerRemotes } from '@mfe/sdk';
// Same SDK instance as every registered remote — one in-memory access token
```

**Never:**
- Store tokens in `localStorage` / `sessionStorage`
- Pass tokens as URL params
- Log tokens
- Put tokens in window object

**HTTP rule — `@mfe/sdk` is the only HTTP client:**

- Apps **never** `import axios`, and never call `fetch('/api/v1/...')` directly. Use `api.*`.
- `api.*` resolves with an `AxiosResponse<T>` → read the payload from `res.data`.
- Failures reject with `ApiError { status, body, message }`; `status === 0` means the request never reached the server.
- The SDK sets `withCredentials: true` on every request. Never re-implement auth headers or retries in an app.
- The auth endpoints deliberately bypass the retry interceptor (`authHttp`), so a wrong password surfaces as a 401 instead of a refresh loop.

### 2.5 Error Handling

**API errors (from SDK):** every auth/API failure rejects with a single `ApiError`
shape — never a raw `Response`, never a bare axios error.

```typescript
import { ApiError, api } from '@mfe/sdk';

async function loadScopes() {
  try {
    const res = await api.get<Scope[]>('/api/v1/scopes');
    return res.data;                       // axios already parsed the JSON
  } catch (err) {
    if (err instanceof ApiError) {
      // err.status: HTTP status, or 0 when the request never reached the server
      switch (err.status) {
        case 401:                          // SDK already tried refresh + redirect
          return [];
        case 403:
          throw new Error('You do not have permission to view scopes.');
        case 409: {
          const body = err.body as { errorCode?: string } | undefined;
          throw new Error(`conflict: ${body?.errorCode ?? 'unknown'}`);
        }
        default:
          throw new Error(err.message);
      }
    }
    throw err;
  }
}
```

> 401 handling (refresh-once, then redirect to `/login?next=…`) is owned by the SDK
> interceptors. An app should not add its own retry or token logic.

**Redirect safety — always pass `?next=` through `safeNext()`.** `packages/mfe-sdk/src/next.ts`
only accepts paths matching `^/app(/.*)?$` and falls back to `/app` for everything else
(absolute URLs, bare `/`, `/login`, `//evil.test`, …). The SDK's own 401 handler and
`landing/src/pages/Login.tsx` both use it; hand-rolling `window.location.assign(next)` on a
raw query param is an open redirect.

### 2.6 Testing

**landing, shell, demo-react and admin-react have no test runner yet.** There is no vitest /
`@testing-library/*` dependency, no `test` script, and no `*.test.*` / `*.spec.*` file in any
of them. Do not write docs or code that assume component tests exist.

The only frontend suite is the SDK's:

- `packages/mfe-sdk/src/{api,auth,next,remote}.spec.ts` — **4 files, 44 tests**
- Run: `pnpm test` from `packages/mfe-sdk/` (Vitest; the spec files install a scripted axios
  adapter from `src/testing/axios-adapter.ts`, so the interceptor chain is tested without network)

If component tests are added later, wire Vitest + React Testing Library **and** a per-app
`test` script in the same change — the convention comes from that change, not from this doc.

### 2.7 TypeScript

**Strict mode enabled; use explicit types:**

```typescript
// ✓ Good
interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
}

export function LoginForm({ onSubmit, loading }: LoginFormProps) {
  // ...
}

// ✗ Avoid
export function LoginForm({ onSubmit, loading }: any) {
  // ...
}
```

### 2.8 Module Federation

#### 2.8.1 Hybrid multi-surface remotes (Spec B)

Default: **nested routes** inside one `{ mount, unmount }` expose.

Add a **second expose + `MfeConfig`** only when **scopes differ** OR you need a **separate shell nav / title / `routeName`** (rule C).

| Convention | Rule |
|------------|------|
| Bundle identity | Same `remoteName` (+ same `remoteEntry` origin) = one deployable. **No `bundleId` column.** |
| Standalone | Primary nested app only (e.g. Product). Extra exposes are shell-nav concerns. |
| Roots | Each expose file keeps its **own** module-level `root` — never share across Product/Article. |

**Anti-patterns:** one expose per page; duplicate `MfeConfig` for a URL already nested under the primary; extra expose without nav/scope justification.

Proof remote (`remotes/demo-react`, path may stay `/r/demo-react` until rename):

| `routeName` | `remoteName` | `exposedModule` |
|-------------|--------------|-----------------|
| `product` | `productReact` | `./Product` |
| `article` | `productReact` | `./Article` |

Category lives **nested** under Product — not a separate expose.

**Host (shell) config — `shell/vite.config.ts`:**

```typescript
// Docker sets CHOKIDAR_USEPOLLING. MF type hints open ws://127.0.0.1:16322 from the
// browser, which is unreachable from inside a container — so gate them off there.
const enableMfTypeHints = process.env.CHOKIDAR_USEPOLLING !== 'true';

export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    federation({
      name: 'shell',
      // Intentionally empty — remotes are registered at runtime from
      // GET /api/v1/mfe-configs/accessible (see Gate.tsx). Never hardcode remotes here.
      remotes: {},
      // Keep host init in index.html; do NOT switch to 'entry'.
      hostInitInjectLocation: 'html',
      dts: enableMfTypeHints,
      dev: { disableDynamicRemoteTypeHints: !enableMfTypeHints },
      shared: {
        '@mfe/sdk':        { singleton: true, requiredVersion: '^0.1.0' },
        'react-hook-form': { singleton: true, requiredVersion: '^7.88.0' },
        react:             { singleton: true, requiredVersion: '^18.3.0' },
        'react-dom':       { singleton: true, requiredVersion: '^18.3.0' },
        '@mui/material':   { singleton: true, requiredVersion: '^6.0.0' },
        '@emotion/react':  { singleton: true, requiredVersion: '^11.0.0' },
        '@emotion/styled': { singleton: true, requiredVersion: '^11.0.0' },
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
    origin: 'http://localhost:8080',   // browser-facing origin is the Caddy gateway
    hmr: { clientPort: 8080 },
  },
});
```

**Remote config — `remotes/demo-react/vite.config.ts`:**

```typescript
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/r/demo-react/' : '/',
  plugins: [
    react(),
    federation({
      name: 'productReact', // must match MfeConfig.remoteName
      filename: 'remoteEntry.js',
      exposes: {
        './Product': './src/exposes/product.tsx',
        './Article': './src/exposes/article.tsx',
      },
      manifest: true,
      shared: { /* '@mfe/sdk', react-hook-form, @tanstack/react-query, react/react-dom, MUI, emotion */ },
    }),
  ],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
}));
```

**Shared-scope rules (do not "simplify" these):**

- Every one of the 7 shared entries is `singleton: true` **with** a `requiredVersion`, and
  there is deliberately **no `strictVersion`** — a strict mismatch hard-fails at runtime
  instead of negotiating.
- `@mfe/sdk` singleton → one in-memory access token shared by shell + remotes.
- `react-hook-form` singleton → one form registry.
- **`axios`, `zod` and `@hookform/resolvers` are deliberately NOT shared.** axios is an
  implementation detail of the SDK; sharing zod/resolver subpaths leaks into the shared
  scope. Adding any of them is a regression, not a cleanup.

**Mount contract — `remotes/demo-react/src/exposes/product.tsx` (Article is parallel):**

```typescript
import { createRoot, type Root } from 'react-dom/client';
import type { RemoteMountContext } from '@mfe/sdk';
import { ProductApp } from '../ProductApp';

let root: Root | null = null;

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  root = createRoot(el);
  root.render(<ProductApp {...ctx} />);
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
```

The **shell** side (`shell/src/pages/RemoteOutlet.tsx`) calls
`remote.mount(el, { basePath: '/app/<routeName>', routeName, locale?, onNotify? })` —
`RemoteMountContext` in `@mfe/sdk`. Optional `onNotify` is a **one-way** Snackbar channel
(not an event bus; must not call `refreshAccessibles`). Adding a second callback or a
topic-based emitter requires a fresh architecture decision — do not grow the ctx casually.

**Dev-origin wiring:**

- Local team DX: `pnpm/npm run dev` on the host (`make infra` + backend). Vite may proxy `/api`.
- Integrated: `make up` serves **production** static FE behind Caddy `:8080`.
- Asset bases: landing `/`, shell `/app/`, product remote build `/r/demo-react/`, admin `/r/admin-react/`.

### 2.9 Forms (react-hook-form + zod)

Every new form — landing today, the planned admin remote (`plans/260913-2113-admin-remote-ui/`,
Phase D5) later — uses **react-hook-form**
with a **zod** schema via `zodResolver`, and wires MUI inputs through
`Controller` (MUI's `TextField` is not a native input, so `register()` drops its ref).

- The schema lives in `src/schemas/*.ts` and is the single source of truth for both
  validation and the inferred TypeScript type.
- Always pass `defaultValues`.
- Field errors come from `formState.errors` → the input's `error`/`helperText`.
- Server errors stay outside RHF: catch `ApiError` inside `handleSubmit` and render a
  form-level `Alert`.
- Never hand-build `FormData` or read inputs by `name=` lookup.

```typescript
// landing/src/schemas/auth.ts — schema rules mirror the backend DTOs
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 6;                          // backend PasswordField()
const PASSWORD_ALLOWED_CHARS = /^[\d!#$%&*@A-Z^a-z]*$/;        // backend IsPassword()

export const registerSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_ALLOWED_CHARS, 'Password may only contain letters, numbers and ! # $ % & * @ ^'),
});
export type RegisterForm = z.infer<typeof registerSchema>;

// landing/src/pages/Login.tsx — relative import, no @/
import { loginSchema, type LoginForm } from '../schemas/auth.js';

const form = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

const onSubmit = form.handleSubmit(async (values) => {
  try {
    await login(values);
    window.location.assign(safeNext(next));
  } catch (err) {
    setFormError(err instanceof ApiError ? messageFor(err) : 'Something went wrong.');
  }
});

<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <TextField {...field} label="Email" error={!!fieldState.error}
      helperText={fieldState.error?.message} />
  )}
/>
```

Client-side rules **mirror the server** (`backend/src/decorators/field.decorators.ts`,
`PasswordField()` → `minLength: 6`, `IsPassword()` → the charset above) so a bad password is a
field-level error instead of a round-trip 422. Note `loginSchema` intentionally keeps
`min(1)` on password: login should not reveal the registration policy.

### 2.10 Hooks (usehooks-ts)

Prefer [`usehooks-ts`](https://usehooks-ts.com) over hand-rolled one-liners when an
equivalent exists — `useBoolean` for toggles, `useMediaQuery` for breakpoints,
`useLocalStorage`… **except** for tokens: never persist auth state in storage.

```typescript
// ✓ Good — intent-revealing, no bespoke reducer
const { value: drawerOpen, setTrue: openDrawer, setFalse: closeDrawer } = useBoolean(false);

// ✗ Avoid — re-implementing a well-tested hook
const [drawerOpen, setDrawerOpen] = useState(false);
```

### 2.11 Locked frontend dependency pins

| Concern | Package | Version | Scope |
|---------|---------|---------|-------|
| HTTP | `axios` | `^1.20` | **dependency of `@mfe/sdk` only** |
| Forms | `react-hook-form` | `^7.88` | per-app + **MF shared singleton** |
| Resolver | `@hookform/resolvers` | `^5.9` | per-app (never shared) |
| Schema | `zod` | `^4.6` | per-app (never shared) |
| Server state | `@tanstack/react-query` | `^5` | per-app (+ MF shared when remotes use it); wraps `@mfe/sdk` `api.*` / async loaders — **never** raw `fetch`/`axios` in apps |
| Hooks | `usehooks-ts` | `^3.1` | per-app |
| UI | `@mui/material` | `^6` | per-app + MF shared |
| Federation | `@module-federation/vite` | `1.22.0` | **pinned; bump only with a regression run** (pair with `@module-federation/enhanced@2.9.0`) |

Do not introduce `yup` or React 19 in this phase. Prefer React Query over `useEffect` + imperative loads for list/detail server state.

---

**Document version:** 2.2  
**Last updated:** 2026-09-16
