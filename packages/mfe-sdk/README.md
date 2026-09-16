# @mfe/sdk

Shared SDK for the MFE platform. Provides:

- **Auth** — login, register, refresh, logout. Access token lives in **module memory only** (never localStorage/sessionStorage).
- **API wrapper** — `get/post/put/patch/delete` returning `AxiosResponse<T>`, with automatic Bearer header, 401→refresh→retry, and deduped in-flight refresh.
- **Remote loader** — register and load MFE remotes via Module Federation 2 runtime.
- **safeNext** — sanitises shell `?next=` values to `/app…` only (open-redirect safe).
- **safeStandalonePath** / **setRedirectPolicy** — standalone SPAs keep same-origin relative `next` paths.
- **ApiError** — the single rejection shape for every auth/API failure.

---

## Token model

| Token | Storage | Lifetime |
|-------|---------|----------|
| Access | Module-level `let` (memory) | 15 min; lost on page reload |
| Refresh | `HttpOnly` cookie (`refresh_token`) | Configured by backend |

JS **never** reads the refresh cookie. It is sent automatically because every request sets `withCredentials: true`.

---

## HTTP layer (axios is an implementation detail)

`http.ts` owns the **only** axios instances in the platform:

| Instance | Used by | Interceptors |
|----------|---------|--------------|
| `http` | `api.*` | Bearer injection from memory + one deduped refresh-and-retry on 401 |
| `authHttp` | `login` / `register` / `refresh` / `logout` | **none** — a 401 from an auth endpoint means bad credentials, not an expired token, so it must not trigger a refresh loop |

**Rules for apps:**

- Apps (landing, shell, remotes) must **never** `import axios`. Use `api` / the auth helpers.
- A non-2xx response, a network failure, or a timeout rejects with `ApiError`
  (`{ status, body, message }`); `status` is `0` when the request never reached the server.
- Read the payload from `res.data` (axios parses JSON for you).
- Concurrent 401s share exactly one `refresh()` network call (`refreshInflight`); each request retries at most once.
- `axios` is a runtime dependency **of this package only**. It is intentionally *not* added to the Module Federation `shared` scope — the SDK is the shared boundary.

---

## Install (file: dep, this phase)

```jsonc
// in landing/package.json, shell/package.json, remotes/demo-react/package.json
{
  "dependencies": {
    "@mfe/sdk": "file:../../packages/mfe-sdk"
  }
}
```

> Depth from `landing/` or `shell/` is `../../packages/mfe-sdk`.  
> From `remotes/demo-react/` the depth is also `../../packages/mfe-sdk`.

---

## API surface (spec §5.4)

```ts
// Auth
login(dto: { email: string; password: string }): Promise<{ userId: string; tokenExpires: number }>
register(dto: { email: string; password: string }): Promise<{ userId: string }>
refresh(): Promise<{ userId: string; tokenExpires: number }>
logout(): Promise<void>
getAccessToken(): string | null
clear(): void

// API wrapper — axios responses; failures reject with ApiError
api.get<T>(path, config?): Promise<AxiosResponse<T>>
api.post<T>(path, body?, config?): Promise<AxiosResponse<T>>
api.put<T>(path, body?, config?): Promise<AxiosResponse<T>>
api.patch<T>(path, body?, config?): Promise<AxiosResponse<T>>
api.delete<T>(path, body?, config?): Promise<AxiosResponse<T>>
setRedirect(fn): void            // injectable; tests override window.location
toApiError(err): ApiError        // normalise an unknown throwable

// Errors
class ApiError extends Error { status: number; body: unknown }

// Remote loader
registerRemotes(cfgs: MfeRemoteRef[]): Promise<void>
loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule>
setMfRuntime(runtime): void      // required in browser hosts before register/load
clearMfRuntime(): void           // tests only

// Navigation helper
safeNext(value: string | null | undefined): string  // → /app unless ^/app(/.*)?$
safeStandalonePath(value, fallback?): string        // same-origin relative paths only
setRedirectPolicy('shell' | 'standalone'): void     // default 'shell'; hosted shell must NOT set standalone
sanitizeNextForPolicy(value): string                // uses active policy
```

---

## Usage in Shell (Vite + Module Federation)

### `vite.config.ts` shared config snippet

```ts
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'shell',
      shared: {
        '@mfe/sdk': {
          singleton: true,       // ← critical: one in-memory token for all remotes
          requiredVersion: '^0.1.0',
          eager: true,
        },
        react: { singleton: true, requiredVersion: '^18.3.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.3.0', eager: true },
        // react-hook-form is also shared as a singleton (see docs/code-standards-frontend.md §2.8).
        // Do NOT share zod or @hookform/resolvers — per-app bundles are fine.
      },
    }),
  ],
});
```

### `vite.config.ts` shared config for a remote

```ts
federation({
  name: 'productReact',
  filename: 'remoteEntry.js',
  exposes: {
    './Product': './src/exposes/product.tsx',
    './Article': './src/exposes/article.tsx',
  },
  shared: {
    '@mfe/sdk': { singleton: true, requiredVersion: '^0.1.0' },
    react: { singleton: true, requiredVersion: '^18.3.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
  },
}),
```

### Shell boot sequence

```ts
import {
  registerRemotes as mfRegisterRemotes,
  loadRemote as mfLoadRemote,
} from '@module-federation/enhanced/runtime';
import { refresh, registerRemotes, loadRemote, api, setMfRuntime } from '@mfe/sdk';

// 0. Host injects the MF default instance (shell main.tsx). Bare dynamic import
//    of @module-federation/enhanced/runtime fails inside the shared SDK chunk.
setMfRuntime({ registerRemotes: mfRegisterRemotes, loadRemote: mfLoadRemote });

// 1. Hydrate access token from refresh cookie
await refresh();  // throws 401 if no cookie → redirect to /login

// 2. Fetch accessible remotes (axios response — payload is res.data)
const res = await api.get<MfeAccessibleItem[]>('/api/v1/mfe-configs/accessible');
const items = res.data;

// 3. Register all remotes with MF runtime
await registerRemotes(items);

// 4. On navigation to /app/:routeName
const remote = await loadRemote(item);  // throws if mount/unmount missing
await remote.mount(el, { basePath: '/app', routeName: item.routeName });
```

---

## Cookie flags (backend sets these)

```
Set-Cookie: refresh_token=<value>; HttpOnly; Path=/; SameSite=Lax; Max-Age=<ttl>
```

`Secure` flag is added only when `APP_ENV=production`.

---

## Local development

### Prerequisites

- `. .dev-bin/env.sh` from repo root
- No dedicated dev server — this package is consumed via `file:` by FE apps

### Install

```bash
cd packages/mfe-sdk
pnpm install
```

Install this package **before** landing/shell/remotes that depend on it.

### Env

None.

### Run

No `dev` script. Apps import TypeScript source directly.

### Ports & origins

N/A (library).

### Quality

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test          # vitest (~51 tests)
pnpm test:watch
```

Unit tests never touch the network: `src/testing/axios-adapter.ts` installs a
scripted axios adapter so the real interceptor chain is exercised.

### Verify

```bash
pnpm test && pnpm typecheck
```

### Related

- Hub: [docs/local-development-guide.md](../../docs/local-development-guide.md)

---

## Security guarantees

- Access token is in a `let` variable; dies on page reload (by design).
- Refresh cookie is `HttpOnly` — inaccessible to JS.
- `safeNext` blocks open redirect: only `^/app(/.*)?$` is allowed (shell).
- Standalone apps call `setRedirectPolicy('standalone')` once at boot so 401 → `/login?next=<same-origin path>`. Hosted shell must leave the default `'shell'` policy.
- No token in URL, query string, or `console.log`.
- Every request sets `withCredentials: true` for cookie transport.
