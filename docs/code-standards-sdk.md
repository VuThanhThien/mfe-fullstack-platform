# SDK (`@mfe/sdk`) Code Standards

> Part of the code-standards set. Hub and cross-cutting rules: [`docs/code-standards.md`](./code-standards.md).
> Backend: [`code-standards-backend.md`](./code-standards-backend.md) · Frontend: [`code-standards-frontend.md`](./code-standards-frontend.md) · SDK: [`code-standards-sdk.md`](./code-standards-sdk.md)

**Authority:** running code wins — `packages/mfe-sdk/src/` is ground truth for the SDK surface.

**Siblings:** §1 Backend → [`code-standards-backend.md`](./code-standards-backend.md) · §2 Frontend → [`code-standards-frontend.md`](./code-standards-frontend.md) · §4–§6 hub → [`code-standards.md`](./code-standards.md).

---

## 3. SDK (@mfe/sdk) Standards

### 3.1 Structure

**The SDK is consumed as TypeScript source — there is no build step.** `package.json` points
`exports`, `main` and `types` at `./src/index.ts`, ships `files: ["src"]`, and lists
`@module-federation/enhanced` as an **optional peer dependency**. Do not add a build
`vite.config.ts`, an `__tests__/` directory, or a `dist/` layout.

```
packages/mfe-sdk/
├── src/
│   ├── api.ts            # api.get/post/put/patch/delete facade + toApiError
│   ├── auth.ts           # login, register, refresh, logout, clear
│   ├── errors.ts         # ApiError { status, body, message }
│   ├── http.ts           # the ONLY axios instances (http, authHttp) + interceptors
│   ├── index.ts          # Barrel export (public surface)
│   ├── next.ts           # safeNext() open-redirect guard
│   ├── remote.ts         # registerRemotes, loadRemote, toRuntimeEntry
│   ├── token.ts          # in-memory access token (dependency-free)
│   ├── types.ts          # Interfaces
│   ├── api.spec.ts       # ┐
│   ├── auth.spec.ts      # │ colocated specs — 4 files, 44 tests
│   ├── next.spec.ts      # │
│   ├── remote.spec.ts    # ┘
│   └── testing/
│       └── axios-adapter.ts   # scripted axios adapter used by the specs
├── package.json          # exports/main/types → ./src/index.ts; files: ["src"]
├── vitest.config.ts
├── tsconfig.json
└── README.md
```

### 3.2 Exports

```typescript
// src/index.ts (barrel)
export { login, register, refresh, logout, getAccessToken, clear } from './auth.js';
export { api, setRedirect, toApiError } from './api.js';
export { ApiError } from './errors.js';
export { registerRemotes, loadRemote, toRuntimeEntry } from './remote.js';
export { safeNext } from './next.js';
export type {
  MfeRemoteRef, RemoteModule, MfeAccessibleItem, AuthResponse, RegisterResponse,
} from './types.js';
```

Internal modules (`token.ts`, `http.ts`, `testing/*`) are **not** exported — apps use
the surface above. `setRedirect` is exported because tests and SSR need to replace
`window.location` navigation.

### 3.3 In-Memory State

`token.ts` holds the single access token; nothing else stores auth state.

```typescript
// src/token.ts — dependency-free, so http.ts can read it without a cycle
let accessToken: string | null = null;
export function getAccessToken(): string | null { return accessToken; }
export function setAccessToken(token: string | null): void { accessToken = token; }
export function clearAccessToken(): void { accessToken = null; }

// src/auth.ts — ONE in-flight refresh shared by every concurrent 401
let refreshInflight: Promise<{ userId: string; tokenExpires: number }> | null = null;

export function refresh() {
  if (refreshInflight) return refreshInflight;  // callers share one request
  refreshInflight = (async () => { /* authHttp.post('/api/v1/auth/refresh') */ })()
    .finally(() => { refreshInflight = null; });
  return refreshInflight;
}
```

There is deliberately **no** `tokenExpires` module state: the backend returns it to
the caller, and expiry is enforced server-side (401 → refresh → retry, see §3.4).


### 3.4 HTTP Layer (axios)

`http.ts` owns the **only** axios instances in the platform. Apps never see axios.

| Instance | Used by | Interceptors |
|----------|---------|--------------|
| `http` | `api.*` | Bearer injection from the in-memory token, plus one deduped refresh-and-retry on 401 |
| `authHttp` | `login` / `register` / `refresh` / `logout` | **none** — a 401 from an auth endpoint means bad credentials, so it must not trigger a refresh loop |

The interceptor implementation lives in `packages/mfe-sdk/src/http.ts`; the canonical,
maintained description of the token model, retry flow and app-facing rules is
**[`packages/mfe-sdk/README.md`](../packages/mfe-sdk/README.md)**. Read it there rather than
duplicating the code here — this section deliberately keeps only the locked rules.

**Facade signatures** (`packages/mfe-sdk/src/api.ts`): `get(path, config?)`,
`post(path, body?, config?)`, `put(path, body?, config?)`, `patch(path, body?, config?)`, and
`delete(path, body?, config?)`. `delete` accepts a body and forwards it as axios `config.data`,
so a DELETE-with-payload keeps the same call shape as the other verbs.

Design rules (locked):

1. **Access token** lives in `token.ts` — a dependency-free module — so the request
   interceptor can read it without importing `auth.ts`. The 401 handler pulls
   `refresh()` in lazily via dynamic `import()`; a static import would create an
   `auth <-> http` cycle.
2. **One retry maximum**, tracked by `config._isRetry`.
3. **Refresh is deduped** by the existing `refreshInflight` promise — never add a
   second mutex.
4. **Auth endpoints use `authHttp`** so a bad password is reported as a 401 instead
   of starting a refresh.
5. **Errors** are normalised to `ApiError { status, body, message }` in `api.ts`
   (`status === 0` for transport failures).
6. Unit tests install a scripted axios adapter (`src/testing/axios-adapter.ts`):
   no network, and the real interceptor chain stays under test.

---

**Document version:** 2.0  
**Last updated:** 2026-09-13
