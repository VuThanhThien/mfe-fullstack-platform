# System Architecture & Technical Design

**Date:** 2026-09-13  
**Version:** 1.1  
**Scope:** Backend (Phase B complete) + Frontend (Phase C complete — executed)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Browser / User Agent                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTP/HTTPS
                              │
┌─────────────────────────────────────────────────────────────────┐
│             Caddy Reverse Proxy (localhost:8080)                │
│  (Phase C) Same-origin routing only (no TLS, no compression)    │
└─────────────────────────────────────────────────────────────────┘
         │              │             │             │
         ▼              ▼             ▼             ▼
    Landing        Shell         Backend       Demo-React
  (:5173)          (:5174)        (:3000)       (:5175)
   React           React         NestJS         React
   Vite            Vite          Express        Vite
   MUI             MUI           MUI            MUI


┌─────────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                          │
├─────────────────────────────────────────────────────────────────┤
│  Postgres 16              Redis               Docker              │
│  (TypeORM)          (cache-manager)        (containerized)        │
│   • users            • session blacklist  • local dev env         │
│   • scopes           • email-verify       • prod deploy ready     │
│   • mfe_configs      • password-reset     • containerized         │
│   • sessions         • (no access tokens)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Architecture (Phase B — Stable)

### 2.1 Runtime Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node 20.18.0 + pnpm 9.x | LTS stability, monorepo package mgmt |
| **Framework** | NestJS 10 + Express | Type-safe DI, modular structure |
| **Database** | Postgres 16 + TypeORM 0.3 | Relational schema, hand-migrated |
| **Cache/Revocation** | Redis + cache-manager-ioredis-yet | Session blacklist, fast lookups |
| **Logging** | pino + nestjs-pino | Structured logging, performance |
| **Docs** | Swagger/OpenAPI | `/api/docs` in dev mode |

### 2.2 Modular Structure

```
src/
├── api/                          # Feature modules (use-cases)
│   ├── auth/                     # Login, register, refresh, logout
│   │   ├── auth.controller       # HTTP layer
│   │   ├── auth.service          # Business logic (JWT, blacklist)
│   │   ├── config/               # Auth config (TTL, secrets)
│   │   ├── dto/                  # Request/response DTOs
│   │   ├── types/                # JWT payload, etc.
│   │   └── auth.module           # DI module
│   ├── user/                     # User management (CRUD, ADMIN-gated)
│   ├── scope/                    # Scope management (ADMIN-gated)
│   ├── mfe-config/               # Registry (CRUD + accessible query)
│   ├── post/                     # Posts module (present; not imported by ApiModule)
│   ├── home/                     # Home/root info module
│   ├── health/                   # Liveness probe
│   └── api.module                # Root API module
├── background/
│   └── queues/                   # BullMQ queues (email-queue)
├── common/                        # Shared types, DTOs, interfaces
├── config/                        # Typed config (app, auth, db, mail, etc.)
├── database/
│   ├── data-source.ts            # TypeORM connection
│   ├── entities/                 # Entity definitions
│   ├── migrations/               # Hand-written SQL
│   ├── seeds/                    # Seed jobs (admin, dashboard user, etc.)
│   └── factories/                # Test data builders
├── decorators/                    # @CurrentUser, @RequireScopes, field decorators
├── exceptions/                    # Custom exceptions
├── filters/                       # GlobalExceptionFilter (status + errorCode mapping)
├── guards/                        # AuthGuard (global), ScopesGuard (global)
├── i18n/                          # Message catalogs (en, vi, jp)
├── libs/                          # aws/, gcp/ integrations
├── mail/                          # MailModule, MailService, templates/
├── redis/                         # Redis config
├── shared/                        # Shared module
├── constants/                     # Error codes, app constants
├── utils/                         # Helpers (configure-app, pagination, setup-swagger)
├── app.module.ts                  # Root module (generateModulesSet)
└── main.ts                        # Bootstrap entry point
```

### 2.3 Authentication Flow (Phase B)

```
1. POST /api/v1/auth/email/login { email, password }
   ├─ Hash password, compare with DB
   ├─ Load user + scopes from DB
   ├─ Sign JWT { id: userId, sessionId, scopes: [], iat, exp: +15m }
   ├─ INSERT a session row in Postgres (uuid `id` + sha256 `hash`)
   ├─ Return { userId, accessToken, tokenExpires } (LoginResDto)
   └─ Response header: Set-Cookie: refresh_token=... (HttpOnly cookie)

2. GET /api/v1/users (or any protected endpoint)
   ├─ Extract Bearer token from Authorization header
   ├─ Verify JWT signature + TTL
   ├─ Check Redis blacklist (was logout called?)
   ├─ Attach user + scopes to request
   ├─ Guard checks @RequireScopes decorator
   └─ Return 200 or 401/403 if failed

3. POST /api/v1/auth/refresh (Phase C addition)
   ├─ Read refresh_token cookie
   ├─ Verify signature + expiration
   ├─ Load fresh scopes from DB (unlike access token)
   ├─ Issue new access + rotate refresh cookie
   └─ Return { userId, accessToken, tokenExpires }

4. POST /api/v1/auth/logout
   ├─ Extract Bearer token (JwtPayloadType)
   ├─ Redis: SET auth:session-blacklist:<sessionId> = true,
   │  TTL = remaining access-token life (userToken.exp - now)
   ├─ DELETE the Postgres session row
   ├─ Clear refresh cookie (maxAge: undefined)
   └─ Return 200
```

### 2.4 Authorization Model

**Scope-only (no roles/permissions table):**

```
user ──< user_scope >── scope ──< mfe_config_scope >── mfe_config

Privileges are represented as scopes (strings). A user's access is determined by:
  - Scopes they own
  - Intersection with resource's required scopes

Example:
  - User owns [ADMIN, DASHBOARD]
  - Admin endpoint requires [ADMIN] → ✓ allowed
  - Config visible to [DASHBOARD] → ✓ allowed
  - Config visible to [EDITOR] → ✗ denied (no intersection)
  - ADMIN does NOT bypass [EDITOR] check (explicit design)
```

### 2.5 Scope Staleness & Consistency Model

**Two freshness rules — token-based checks lag, `accessible` does not:**

| Operation | When Effective | Reason |
|-----------|----------------|--------|
| Grant scope to user | Token-based `@RequireScopes` checks: on next `refresh` or token expiry (≤15m). `GET /mfe-configs/accessible`: immediately | Access token not re-read from DB until refresh; `accessible` re-reads the user's scopes on every call |
| Revoke scope | Token-based checks: on next `refresh` (or immediately if logout). `accessible`: immediately | Logout blacklists session instantly; `accessible` re-reads scopes from DB |
| Delete user | Immediately if soft-deleted + blacklisted | Scope grants cascade; sessions cleared |
| Edit MfeConfig | On next `accessible` call (reads DB) | `/accessible` re-queries, not cached |

**Consequence:** The ≤15-minute lag applies **only to token-based authorization** — i.e. `@RequireScopes` endpoints, which read the scopes baked into the JWT. `GET /api/v1/mfe-configs/accessible` re-reads the caller's scopes from the **database** on every call (`MfeConfigService.findAccessible`), so a scope grant or revocation — and any newly visible config — shows up on the next nav load / `accessible` request, with no refresh and no waiting for the TTL. Revoking is also instant via logout for the token-based checks.

### 2.6 Data Consistency Rules

| Entity | Versioning | Soft Delete | Cascades | Constraints |
|--------|-----------|-------------|----------|------------|
| `user` | `createdAt`, `updatedAt` | ✓ `deletedAt` | → user_scope (cascade); blacklist sessions | PK uuid |
| `scope` | `createdAt`, `updatedAt` | ✗ hard delete | RESTRICT if in use (→ 409) | PK uuid; name unique + uppercase |
| `user_scope` | — | — | user del → cascade; scope del → restrict | — |
| `mfe_config` | `createdAt`, `updatedAt` | ✗ hard delete | → mfe_config_scope (cascade) | PK uuid; `route_name` unique; (`remote_name`,`exposed_module`) unique; shared `remote_entry`/`remote_name` allowed for multi-expose |
| `mfe_config_scope` | — | — | config del → cascade; scope del → restrict | — |
| `session` | `createdAt`, `updatedAt` | — | FK → user (no cascade) | PK uuid `id`; `hash` is a separate sha256 column; no TTL column |

---

## 3. Frontend Architecture (Phase C — Complete ✓)

### 3.1 Frontend Stack

| Layer | Technology | Purpose | Phase |
|-------|-----------|---------|-------|
| **Apps** | React 18.3 + Vite 5/6 | Fast dev, proven ecosystem | C |
| **UI kit** | MUI 6 | Consistent design across landing, shell, remotes | C |
| **Router** | react-router-dom 6.x | Client-side routing | C |
| **State** | React Context + hooks | Simple, no global store needed (yet) | C |
| **Federation** | @module-federation/vite 1.16.6 | Runtime remote loading, shared singleton | C |
| **HTTP Client** | @mfe/sdk (axios-based wrapper) | Auth + axios HTTP + federation | C |
| **Gateway** | Caddy | Dev proxy, prod origin | C |

### 3.2 Frontend Topology (3 Apps + SDK)

```
micro-frontend-fullstack-2026/        # ONE git root (branch `master`, no nested repos)
├── landing/                          # standalone Vite app (npm) — NOT a federation consumer
│   ├── src/App.tsx                   # Routes: /, /login, /register
│   ├── src/pages/                    # Home, Login, Register
│   ├── src/schemas/auth.ts           # zod schemas (login + register)
│   ├── src/theme.ts, src/main.tsx
│   ├── package.json                  # React 18.3, Vite, MUI — no MF plugin at all
│   └── vite.config.ts                # base: "/"
│
├── shell/                            # MF host (pnpm)
│   ├── src/App.tsx                   # BrowserRouter basename="/app" + routes
│   ├── src/auth/Gate.tsx             # boot: refresh() → accessible → registerRemotes()
│   ├── src/context/RemoteContext.tsx # registry + throwing useRemoteContext()
│   ├── src/layout/ShellLayout.tsx    # chrome, nav drawer, logout
│   ├── src/pages/                    # RemoteOutlet, NotFound, Unsupported
│   ├── src/main.tsx
│   ├── package.json                  # React 18.3, Vite, MUI, MF host + shared
│   └── vite.config.ts                # base: "/app/", MF host (remotes: {})
│
├── remotes/
│   ├── demo-react/                   # MF remote (pnpm) — folder name legacy; remoteName=productReact
│   │   ├── src/exposes/product.tsx   # ./Product { mount, unmount }
│   │   ├── src/exposes/article.tsx   # ./Article { mount, unmount }
│   │   ├── src/ProductApp.tsx        # nested product/category routes
│   │   ├── src/main.tsx              # standalone SessionGate → Product only
│   │   ├── package.json
│   │   └── vite.config.ts            # build base "/r/demo-react/"; name productReact
│   └── admin-react/                  # MF remote — ADMIN CRUD (pnpm, Phase D5 ✓)
│       ├── src/expose.tsx            # exposes { mount, unmount }
│       ├── src/AdminApp.tsx          # root; SoftGate pattern
│       ├── src/components/           # user/scope CRUD forms
│       ├── src/lib/jwt-scopes.ts     # extract scopes from token
│       ├── src/main.tsx
│       ├── package.json
│       └── vite.config.ts            # base: "/r/admin-react/", exposes ./App
│
├── packages/
│   └── mfe-sdk/                      # shared library — ships raw TS, no build step (pnpm)
│       ├── src/index.ts              # public surface
│       ├── src/auth.ts               # login, register, refresh, logout, clear
│       ├── src/api.ts                # thin axios facade (get/post/put/patch/delete)
│       ├── src/http.ts               # the ONLY axios instances + interceptors
│       ├── src/token.ts              # memory-only access-token store
│       ├── src/errors.ts             # ApiError
│       ├── src/remote.ts             # loadRemote, registerRemotes, toRuntimeEntry
│       ├── src/next.ts               # safeNext (shell) + safeStandalonePath / setRedirectPolicy
│       ├── src/types.ts              # shared interfaces
│       ├── src/testing/axios-adapter.ts
│       ├── src/*.spec.ts             # colocated unit tests
│       ├── package.json              # exports/main/types → ./src/index.ts
│       └── vitest.config.ts          # no vite.config.ts, no build script
│
└── gateway/                          # Caddy config only (no nested repo)
    ├── Caddyfile                     # host hybrid: :8080 → :5173/:5174/:5175/:5176/:3000
    ├── Caddyfile.compose             # root docker-compose.yml: :80 + redir /app /app/ 308
    ├── Caddyfile.docker              # host.docker.internal upstreams
    ├── docker-compose.yml            # Caddy service only
    └── README.md
```

**Real trees only:** there is no `landing/src/components/`, no `shell/src/pages/App.tsx` and no `shell/src/shells/`, no `remotes/demo-react/src/App.tsx` or `src/components/`, and no `packages/mfe-sdk/src/federation.ts` or `vite.config.ts`. Every folder lives under the single repo-root git repository.

### 3.3 Module Federation Architecture

**Shared singleton pattern (7 packages):**

```
Shell (MF host):
┌──────────────────────────────────────────────────────────┐
│ Vite config:                                             │
│   shared: {                                              │
│     '@mfe/sdk':        { singleton: true },              │
│     'react-hook-form': { singleton: true },              │
│     react:             { singleton: true },              │
│     react-dom:         { singleton: true },              │
│     '@mui/material':   { singleton: true },              │
│     '@emotion/react':  { singleton: true },              │
│     '@emotion/styled': { singleton: true }               │
│   }   // axios is NOT shared                             │
└──────────────────────────────────────────────────────────┘
           │  
           ├─────────────────────────────────────────┐
           │                                         │
           ▼                                         ▼
    Demo-React Remote              Future: Vue/Angular
    (MF remote)                     (MF remote)
┌──────────────────────────────┐
│ Exposes: {                   │  Each remote consumes
│   mount(el, ctx),            │  the **same** singleton
│   unmount()                  │  React + @mfe/sdk
│ }                            │  instance. No duplication.
└──────────────────────────────┘
```

**Key:** Only the **shell host** and the **demo-react remote** are federation apps — `landing` is a standalone Vite app with no federation plugin. Both federation configs declare the same 7 singletons listed above, each with a `requiredVersion` and **no** `strictVersion`, so shell and remote negotiate one instance of React, MUI, `react-hook-form` and `@mfe/sdk`. Values are identical except MUI/emotion, where demo-react asks for the slightly newer `^6.1.0` / `^11.13.0`:

| Shared package | shell `requiredVersion` | demo-react `requiredVersion` |
|----------------|-------------------------|------------------------------|
| `@mfe/sdk` | `^0.1.0` | `^0.1.0` |
| `react-hook-form` | `^7.88.0` | `^7.88.0` |
| `react` | `^18.3.0` | `^18.3.0` |
| `react-dom` | `^18.3.0` | `^18.3.0` |
| `@mui/material` | `^6.0.0` | `^6.1.0` |
| `@emotion/react` | `^11.0.0` | `^11.13.0` |
| `@emotion/styled` | `^11.0.0` | `^11.13.0` |

**axios is deliberately NOT shared** (it is a runtime dependency of `@mfe/sdk` only); `zod` and `@hookform/resolvers` also stay per-app.

**Remotes are registered at runtime.** The host config declares `remotes: {}`; nothing is hardcoded in `vite.config.ts`. `Gate` calls `await registerRemotes(items)` with the live payload of `GET /api/v1/mfe-configs/accessible`, so the remote list is entirely data-driven.

### 3.4 Auth Flow (Frontend Integration)

```
Landing:
  1. Register → POST /api/v1/auth/email/register → { userId }
              → Redirect /login
  2. Login → POST /api/v1/auth/email/login → Set-Cookie: refresh_token
           → { userId, accessToken, tokenExpires }
           → Store accessToken in memory (variable)
           → Redirect next (?next=/app) or /app
           → **Memory access token dies here; shell will refresh**

Shell (boot):
  1. POST /api/v1/auth/refresh (with cookie)
     → { userId, accessToken, tokenExpires }
     → Store in memory
     → GET /api/v1/mfe-configs/accessible → [ remote configs ]
     → Render nav
  2. User clicks nav item → /app/:routeName
  3. loadRemote(remoteEntry) → mount(el, { basePath, routeName })
  4. Remote uses import { api } from '@mfe/sdk'
     → api.get('/api/v1/...') → axios GET with Bearer header

Logout:
  1. Shell calls logout() (SDK)
  2. SDK: clears the in-memory token, then POST /api/v1/auth/logout (Bearer, best-effort)
  3. Backend: blacklist sessionId in Redis, delete the session row, clear the refresh cookie
  4. Shell: window.location.assign('/login') — the SDK never redirects on logout
```

**Frontend runtime behaviour (as shipped):**

- **Shell boot** (`shell/src/auth/Gate.tsx`): `refresh()` → `GET /api/v1/mfe-configs/accessible` → `await registerRemotes(items)` → provide `RemoteContext` (userId + accessibles + `refreshAccessibles` / `isRefreshing`). After ready, `window` `focus` and `document` `visibilitychange` (visible) re-fetch `accessible` without leaving `status: 'ready'` (nav updates; open remote must not remount). Any boot failure sets a `redirecting` state and does `window.location.assign('/login?next=<pathname>')`.
- **`RemoteOutlet` guards** (`shell/src/pages/RemoteOutlet.tsx`): an unknown `routeName` renders `NotFound`; `framework !== 'react'` renders `Unsupported` **without** calling `loadRemote`; a load/mount failure renders an error panel with a Retry button while the nav stays visible; navigating away unmounts the previous remote via a `cancelled` flag plus the effect cleanup `unmount()`.
- **Landing silent re-auth** (`landing/src/pages/Login.tsx`): on mount it calls `refresh()`; success redirects with `window.location.assign(safeNext(next))` (skipping the form), failure shows the login form. `safeNext` allows only `^/app(/.*)?$`, so `?next=` cannot be turned into an open redirect.

### 3.5 @mfe/sdk Contract

```typescript
// Auth
export async function login(
  dto: { email: string; password: string }
): Promise<{ userId: string; tokenExpires: number }>

export async function register(
  dto: { email: string; password: string }
): Promise<{ userId: string }>

export async function refresh(): Promise<{ userId: string; tokenExpires: number }>

export async function logout(): Promise<void>

// HTTP — src/http.ts holds the platform's only two axios instances (both withCredentials):
//   authHttp : bare, for login/register/refresh/logout
//   http     : Bearer injection + one deduped 401 refresh-and-retry (config._isRetry)
export const api = {
  get<T = unknown>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  post<T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  put<T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  patch<T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  delete<T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
}
// api.* resolve with AxiosResponse<T> → callers read `res.data`.
// Any non-2xx / network / timeout failure rejects with ApiError { status, body, message };
// `status === 0` means the request never reached the server. See toApiError() below.

// Federation (src/remote.ts)
export async function loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule>

export async function registerRemotes(cfgs: MfeRemoteRef[]): Promise<void>

// Rewrites a /remoteEntry.js URL to /mf-manifest.json
export function toRuntimeEntry(remoteEntry: string): string

// Navigation helper (src/next.ts) — only ^/app(/.*)?$ passes
export function safeNext(value: string | null | undefined): string

// Token / redirect hooks
export function getAccessToken(): string | null
export function clear(): void
export function setRedirect(fn: (url: string) => void): void

// Error normaliser (src/api.ts)
export function toApiError(error: unknown): ApiError

// Errors — the single rejection shape for auth + api failures
export class ApiError extends Error {
  readonly status: number   // HTTP status, or 0 when the request never reached the server
  readonly body: unknown    // parsed response body when the server sent one
}

// Types
export type MfeRemoteRef = {
  remoteEntry: string
  remoteName: string
  exposedModule: string
}

export type MfeAccessibleItem = MfeRemoteRef & {
  id: string
  routeName: string
  title: string
  framework: 'react' | 'vue' | 'angular'
}

export type RemoteMountContext = {
  basePath: string
  routeName: string
  /** Optional UI locale hint. */
  locale?: string
  /** One-way user-facing feedback → shell Snackbar. NOT an event bus; does NOT trigger accessible refetch. */
  onNotify?: (n: { level: 'info' | 'success' | 'error'; message: string }) => void
}

export type RemoteModule = {
  mount(el: HTMLElement, ctx: RemoteMountContext): void | Promise<void>
  unmount(): void | Promise<void>
}
```

### 3.6 One-Origin Routing (Caddy)

Matchers are **prefix-based `handle` blocks**, not `/api/v1/*` patterns:

```
Caddy (:8080 on the host / :80 in containers)
  ├─ handle /api*            → Backend    (:3000)
  │    - /api/v1/auth/* (login, register, refresh, logout)
  │    - /api/v1/users/* (ADMIN only; /api/v1/users/me for any user)
  │    - /api/v1/scopes/* (ADMIN only)
  │    - /api/v1/mfe-configs/* (CRUD + accessible)
  │    - /health is NOT matched by /api* → falls to the landing catch-all;
  │      the Makefile health check curls :3000/health directly
  │
  ├─ handle /app*            → Shell      (:5174)
  │    - /app/            (shell layout, nav, empty outlet)
  │    - /app/:routeName/*  (remote outlet; splat for deep-links)
  │
  ├─ handle /r/demo-react*   → Demo-React (:5175)
  │    - /r/demo-react/mf-manifest.json (entry the SDK requests)
  │    - /r/demo-react/remoteEntry.js   (classic entry — rewritten by toRuntimeEntry)
  │    - /r/demo-react/assets/* (JS/CSS)
  │
  ├─ handle /r/admin-react*  → Admin-React (:5176) [Phase D5 ✓]
  │    - /r/admin-react/mf-manifest.json (entry the SDK requests)
  │    - /r/admin-react/remoteEntry.js   (classic entry — rewritten by toRuntimeEntry)
  │    - /r/admin-react/assets/* (JS/CSS)
  │
  └─ handle (catch-all)      → Landing    (:5173)
       - /, /login, /register
```

**Three Caddyfile variants (all in `gateway/`):**

| File | Listens | Upstreams | Used by |
|------|---------|-----------|---------|
| `Caddyfile` | `:8080` | `localhost:5173/5174/5175/3000` | Host hybrid (`caddy run --config Caddyfile`) |
| `Caddyfile.compose` | `:80` | Compose DNS (`landing`, `shell`, `demo-react`, `backend`) | Root `docker-compose.yml`; includes `redir /app /app/ 308` |
| `Caddyfile.docker` | `:80` | `host.docker.internal:*` | `gateway/docker-compose.yml` (apps on the host) |

None of the three terminates TLS or enables compression — it is plain HTTP on the published port. `redir /app /app/ 308` is required in `Caddyfile.compose`: the shell's Vite base is `/app/`, so serving a bare `/app` breaks asset resolution.

**`remoteEntry` → `mf-manifest.json` rewrite:** the seeded config points `remoteEntry` at `/r/demo-react/mf-manifest.json`, and the SDK's `toRuntimeEntry()` additionally rewrites any `/remoteEntry.js` URL to `/mf-manifest.json`. The manifest carries `metaData.remoteEntry.type: "module"`, which the MF runtime needs for a Vite ESM remote — loading raw `remoteEntry.js` as a classic script throws RUNTIME-008.

**Vite base paths (must match Caddy routes):**
- Landing: `base: "/"`
- Shell: `base: "/app/"`
- Demo-React: `base: "/r/demo-react/"`

---

## 4. Environment & Development Workflow (Phase C Complete)

### 4.1 Local Development (Production Parity)

```bash
# Terminal 1: Backend + services
cd backend
docker compose up -d db redis  # Postgres + Redis
pnpm install --frozen-lockfile
pnpm migration:up
pnpm seed:run
pnpm start:dev                 # :3000

# Terminal 2: Gateway (Caddy reverse proxy)
cd gateway
docker compose up              # Listens :8080, proxies all services

# Terminals 3–6: Vite dev servers (HMR via :8080)
cd landing && npm run dev      # :5173 (accessed via :8080/); landing uses npm
cd shell && pnpm dev           # :5174 (accessed via :8080/app)
cd remotes/demo-react && pnpm dev  # :5175 (accessed via :8080/r/demo-react)
cd remotes/admin-react && pnpm dev # :5176 (accessed via :8080/r/admin-react)

# Browser: http://localhost:8080
#  ├─ / → Landing
#  ├─ /login, /register → Landing
#  ├─ /app → Shell (protected; redirect to /login if no cookie)
#  ├─ /api/v1/* → Backend
#  ├─ /r/demo-react/* → Demo-React Remote
#  └─ /r/admin-react/* → Admin-React Remote
```

**Key:** All browser traffic uses `:8080` only. Vite servers on `:5173–:5176` handle HMR internally.

**Docker / Make targets:** `make up` builds and starts the whole stack behind Caddy at `http://localhost:8080`. `make infra` starts only Postgres + Redis, publishing Postgres on host port **25432** (`docker-compose.infra.yml`, `POSTGRES_HOST_PORT`) and Redis on 6379 for the hybrid workflow. `scripts/e2e-demo-remote.mjs` is the repo's browser smoke script (`node scripts/e2e-demo-remote.mjs`, Puppeteer against `http://localhost:8080`).

### 4.2 SDK Dependency Resolution (file: protocol)

All three apps import `@mfe/sdk` as a local `file:` dependency. The relative path differs by depth:

| App | Spec | Installer |
|-----|------|-----------|
| `landing` | `"@mfe/sdk": "file:../packages/mfe-sdk"` | `npm` |
| `shell` | `"@mfe/sdk": "file:../packages/mfe-sdk"` | `pnpm` |
| `remotes/demo-react` | `"@mfe/sdk": "file:../../packages/mfe-sdk"` | `pnpm` |

```jsonc
// landing/package.json and shell/package.json
{ "dependencies": { "@mfe/sdk": "file:../packages/mfe-sdk" } }

// remotes/demo-react/package.json
{ "dependencies": { "@mfe/sdk": "file:../../packages/mfe-sdk" } }
```

**Workflow:**
1. `npm install` in `landing`; `pnpm install` in `shell` / `remotes/demo-react` — each resolves to `packages/mfe-sdk`
2. TypeScript types + runtime are shared (singleton pattern)
3. Changes to `packages/mfe-sdk/src` are reflected immediately in dev mode
4. The SDK has **no build step**: `package.json` points `exports`/`main`/`types` at `./src/index.ts` and ships raw TypeScript. Because it is consumed as source, each frontend Dockerfile must also install the SDK's own runtime dependency (axios) in place, or Vite cannot resolve it from `packages/mfe-sdk/src`.

### 4.3 Access Token Lifecycle

| Action | Storage | Lifetime | How |
|--------|---------|----------|-----|
| Login (landing) | Memory (`accessToken` in `src/token.ts`) | 15 min | `login()` → stores, dies on reload |
| Refresh (shell boot) | Memory (`accessToken` in `src/token.ts`) | 15 min | `refresh()` (reads cookie) → stores fresh |
| Any API call | Implicit (memory) | — | `api.get/post/put/patch/delete` adds `Authorization: Bearer <token>` |
| 401 response | Re-fresh auto | — | SDK intercepts 401, calls `refresh()`, retries request once (`_isRetry`) |
| Logout | Cleared | — | `logout()` clears memory + best-effort POST; backend blacklists + clears cookie; the caller redirects `/login` |

### 4.4 Cookie Lifecycle

| Cookie | Set By | Condition | Path | HttpOnly | SameSite | Secure |
|--------|--------|-----------|------|----------|----------|--------|
| `refresh_token` | Backend (login) | Always | `/` | ✓ Yes | Lax | Dev: No; Prod: Yes |
| `refresh_token` | Backend (refresh) | Always (rotated) | `/` | ✓ Yes | Lax | Dev: No; Prod: Yes |
| Cleared | Backend (logout) | Always | `/` | ✓ Yes | — | — |

**Sent with:** All requests via the SDK's `withCredentials: true` (browser automatic)

**Age and clearing:** `maxAge` = `AUTH_REFRESH_TOKEN_EXPIRES_IN` (365d) on both login and refresh; logout clears the cookie with `maxAge: undefined`. `withCredentials: true` is set on **both** axios instances in `packages/mfe-sdk/src/http.ts` (`BASE_CONFIG`), which is what makes the HttpOnly cookie round-trip on every SDK call.

## 5. Data Flow Diagrams (Phase C Flows)

### 5.1 Happy Path: Login → App → Remote

```
User                 Landing              Shell              Backend
  │                    │                   │                   │
  ├─ register form ─────► POST /auth/email/register
  │                    │                   │                  ◄──┤
  │                    │                   │                   │
  │ ◄────────────────── { userId } ────────────────────────────┤
  │ redirect /login    │                   │                   │
  │                    │                   │                   │
  ├─ login form ────────► POST /auth/email/login
  │                    │                   │                  ◄──┤
  │ Set-Cookie: refresh_token (HttpOnly)  │                   │
  │ ◄────────────────── { userId, accessToken, tokenExpires }  │
  │ [memory: accessToken]                 │                   │
  │ redirect /app      │                   │                   │
  │                    │                   │                   │
  │                                        ├─ POST /auth/refresh (cookie)
  │                                        │                  ◄──┤
  │                                        │ { userId, accessToken }
  │                                        │ [memory: accessToken]
  │                                        │                   │
  │                                        ├─ GET /mfe-configs/accessible
  │                                        │                  ◄──┤
  │                                        │ [ ...configs ]    │
  │                                        │                   │
  │                    [nav rendered]      │                   │
  │ click Demo React ──► /app/demo        │                   │
  │                    │                   │                   │
  │                                        ├─ loadRemote(:5175/remoteEntry.js)
  │                                        ├─ mount(el, { basePath, routeName })
  │                                        │                   │
  │                                        │     [remote mounted]
  │                                        │     API call: `GET /api/v1/...`
  │                                        │     Bearer: memory token ────────┼──► 200 OK
```

### 5.2 Scope Staleness & Refresh

```
Scenario: Admin grants user the DASHBOARD scope

T0: admin@example.com granted [ADMIN]
T0: user@example.com granted [DASHBOARD]
T0: User logs in → access token { scopes: [DASHBOARD], exp: T0 + 15m }
    User can see DASHBOARD configs ✓

T5: Admin grants user [EDITOR] scope
    Backend: user_scope now = [DASHBOARD, EDITOR]

    (a) Token-based checks — @RequireScopes endpoints read the JWT:
        User's access token still = [DASHBOARD] ✗
        Still 403 until the token is refreshed.

    (b) GET /api/v1/mfe-configs/accessible — re-reads scopes from the DB:
        Next call returns the [EDITOR] configs immediately ✓
        No refresh, no waiting for the 15m TTL.

T10: POST /auth/refresh
    Backend: Load fresh scopes from DB → [DASHBOARD, EDITOR]
    Issue new access token { scopes: [DASHBOARD, EDITOR] }
    Now token-based checks pass too ✓

OR

T20: POST /auth/logout
    Backend: blacklist sessionId in Redis immediately; delete the session row
    Next request: 401 (regardless of scope in token)
    User must log in again → fresh token
```

---

## 6. Security & Trust Boundaries

### 6.1 Token Management

| Token | Storage | TTL | Rotation | XSS Risk | Notes |
|-------|---------|-----|----------|----------|-------|
| Access JWT | Memory (variable) | 15m | No (dies on reload) | Low (not accessible to JS attack) | Read every request; no persistence |
| Refresh Token | HttpOnly Cookie | 1 year* | Yes (every refresh) | None (not readable by JS) | Sent automatically; secure flag in prod |

*Refresh TTL is `AUTH_REFRESH_TOKEN_EXPIRES_IN=365d`. Rotation is already implemented: every `POST /api/v1/auth/refresh` writes a new sha256 hash to the session row and re-sets the cookie. A shorter TTL is **not** implemented.

### 6.2 CSRF Mitigation

| Layer | Method | Notes |
|-------|--------|-------|
| **Origin** | Same-origin via Caddy | All FE + BE under `:8080` |
| **Cookie** | `SameSite=Lax` | No cross-site POST with cookie |
| **Tokens** | Bearer in header only | Not in form body (no hidden CSRF tokens needed) |
| **Explicit CSRF tokens** | Not implemented | SameSite=Lax sufficient this phase |

### 6.3 Authorization Enforcement Points

```
1. AuthGuard (global, on all /api/v1/* routes except public)
   ├─ Extract Bearer token
   ├─ Verify JWT signature
   ├─ Check Redis blacklist
   └─ 401 if invalid

2. ScopesGuard (global; no-ops when no @RequireScopes metadata is present)
   ├─ Read REQUIRED_SCOPES metadata via Reflector (handler + class)
   ├─ Read scopes from the JWT payload
   ├─ Require ALL listed scopes (`required.every(...)`) — AND, not intersection
   └─ 403 if any required scope is missing

3. Backend read operations (GET /mfe-configs/accessible)
   ├─ Load user's current scopes from DB (not token)
   ├─ Query configs with ANY-scope intersection
   ├─ Return list (ADMIN still included in scope check)
   └─ Response body: omit scopes field

4. Frontend SDK
   ├─ Append Bearer to every request
   ├─ 401 → Trigger refresh; retry once
   ├─ Refresh 401 → clear + redirect login
   └─ No SDK-level authz (only backend)
```

### 6.4 Logging & Redaction

**Forbidden in logs:**
- `accessToken` JWT
- `refreshToken` or `refresh_token` cookie value
- `password` in plaintext
- `?token=` query params

**Enforced via:**
- `loggingRedactPaths` config (extend for cookie name)
- Backend exception filter (no full request body in 5xx)
- Caddy access log (query params optional; turn off for privacy)

---

## 7. Deployment Architecture (Target)

### 7.1 Development (Local)

```bash
# Terminal 1: Backend
cd backend
docker compose up -d db redis
pnpm start:dev                    # :3000

# Terminal 2: Gateway
cd gateway
docker compose up                 # :8080 reverse proxy

# Terminal 3–5: Vite apps
cd landing && npm run dev         # :5173
cd shell && pnpm dev              # :5174
cd remotes/demo-react && pnpm dev # :5175

# Browser: http://localhost:8080
```

### 7.2 Production (Conceptual)

```
Public Internet
        │
        ▼
   DNS / CDN
        │
        ▼
   TLS Termination
        │
        ▼
   Caddy (origin server)
        │
        ├─► Landing (static SPA or edge runtime)
        ├─► Shell (static SPA or edge runtime)
        ├─► Demo-React (static SPA or edge runtime)
        ├─► Backend API (Node.js + Postgres + Redis)
        └─► 404
```

**Deployment options:**
- **FE apps:** Vercel, Netlify, AWS CloudFront (static hosting)
- **Backend:** Node.js on dedicated server, ECS, Kubernetes
- **Gateway:** Caddy on same origin (or CDN routing)
- **DB/Cache:** Managed Postgres + Redis (AWS RDS, Cloud Memorystore)

---

## 8. Integration Points & Contracts

### 8.1 Frontend → Backend

```
1. Landing → Backend
   POST /api/v1/auth/email/register { email, password }
   POST /api/v1/auth/email/login { email, password }

2. Shell → Backend
   POST /api/v1/auth/refresh (empty body, uses cookie)
   GET /api/v1/mfe-configs/accessible (Bearer)

3. Remote (via SDK) → Backend
   GET /api/v1/... (Bearer, any endpoint)
   POST /api/v1/... (Bearer, any endpoint)

4. Any → Backend
   POST /api/v1/auth/logout (Bearer)
```

### 8.2 Backend → Database

```
1. Login
   SELECT user, user_scope WHERE email
   INSERT session (id uuid, hash sha256, user_id)   # new row; no lookup
   SELECT user, user_scope (scope names for the JWT)

2. Refresh
   SELECT session WHERE id = sessionId              # findOneBy({ id: sessionId })
   compare session.hash with the refresh JWT's `hash` claim (401 on mismatch)
   SELECT user, user_scope (fresh scopes)
   UPDATE session SET hash = newHash                # SessionEntity.update(session.id, { hash })

3. MFE Config
   SELECT mfe_config, mfe_config_scope
   WHERE mfe_config_scope.scope_id IN (user's scopes)
   (ANY-overlap join)
```

### 8.3 SDK Internal

```
Two axios instances (src/http.ts) — the ONLY axios in the platform, both `withCredentials: true`:
  - `authHttp` : bare, no interceptors. Used by login/register/refresh/logout, so a
                 wrong-password 401 can never start a refresh loop or a redirect.
  - `http`     : request interceptor injects the Bearer token; response interceptor
                 performs ONE deduped refresh-and-retry on 401, guarded by
                 `config._isRetry` so a second 401 clears the token and redirects.

Refresh dedupe (src/auth.ts):
  - `let refreshInflight: Promise<{ userId, tokenExpires }> | null = null`
  - Shared by the 401 interceptor and direct callers (`refresh()` returns the same
    promise), so N parallel 401s produce exactly ONE network refresh.

Token store (src/token.ts):
  - `let accessToken: string | null = null` — memory only, never persisted
  - Dependency-free on purpose: `http.ts` can read it synchronously. The 401 handler
    pulls `refresh` in via `await import('./auth.js')` (lazy) to break the former
    auth ↔ http static import cycle.

Redirect guard (src/next.ts):
  - `safeNext()` allows only ^/app(/.*)?$ — used by the SDK's 401 redirect and by
    landing's Login page, so `?next=` cannot become an open redirect.

Shared singleton:
  - All apps (`shell`, `demo-react`) reference the same SDK instance
  - One `logout()` clears memory + fires a best-effort POST; the SDK cannot clear the
    HttpOnly cookie — only the backend does that
```

---

## 9. Performance Considerations

| Operation | Target | Estimate (unbenchmarked) | Notes |
|-----------|--------|--------------------------|-------|
| Login endpoint | <100ms | ~50ms (estimate) | argon2 verify + JWT; no committed benchmark |
| `accessible` query | <200ms | not measured | Step 1: `innerJoin` + `groupBy` for matching config ids; step 2: a second `find` hydrates the rows. Neither uses `leftJoin` |
| Refresh | <100ms | ~50ms (estimate) | DB lookup + JWT; DB re-read required (by design) |
| MF loadRemote | <1s | not measured | Depends on network; browser cache helps |
| Memory access check | <5ms | <1ms | No network call |

**These are targets/order-of-magnitude estimates, not measurements** — the repository has no benchmark artifact backing the `Actual` numbers a previous revision carried.

### Caching Strategy

- **Token in memory** → No cache needed (lives 15m max)
- **accessible list** → No cache (query re-reads the DB, so scope changes are visible on the next call)
- **mf-manifest.json / remoteEntry.js** → Browser cache (immutable URLs via hash)
- **MUI bundle** → Browser cache + code splitting

---

## 10. Monitoring & Observability

### Metrics

- `POST /auth/login` response time
- `POST /auth/refresh` response time
- `GET /mfe-configs/accessible` response time
- 401 rate (potential attacks or config issues)
- 403 rate (auth failures, scope mismatches)
- Redis blacklist size (indicator of session volume)
- Postgres connection pool utilization

### Logging

- Structured logs (pino) with request ID, user ID (when available)
- Error stack traces (without tokens)
- Caddy access logs (turn off query strings in production)

### Errors

- **401 Unauthorized** → Invalid/expired/blacklisted token
- **403 Forbidden** → Valid token but missing required scope
- **422 Unprocessable Entity** → Validation failure (bad input)
- **409 Conflict** → Unique constraint (duplicate email, scope name)
- **500 Internal Server Error** → Unhandled exception (bug)

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Host** | Shell application (MF host) |
| **Remote** | Federated app (e.g., demo-react) |
| **MfeConfig** | Database entity defining a remote's metadata + scopes |
| **Accessible** | Configs a user can see (scope intersection) |
| **Token staleness** | Lag between DB grant and token awareness (15m max) |
| **Singleton** | Shared instance (e.g., @mfe/sdk, react) in MF |
| **remoteEntry** | JavaScript file exposing MF container |
| **mount/unmount** | Lifecycle hooks for remote apps |
| **Bearer** | Authorization header prefix (`Authorization: Bearer <token>`) |
| **HttpOnly** | Cookie flag preventing JS access |

---

**Document version:** 1.1  
**Last updated:** 2026-09-13
