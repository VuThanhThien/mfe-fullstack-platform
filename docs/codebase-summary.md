# Codebase Summary

**Audience:** new developers and agents who need a map of what exists on disk and where.

**Authority:** this file is a *map*, not a specification. Where it describes backend behaviour, the running
code in `backend/src/` is ground truth; where it describes the frontend, the source in each app is ground truth.
See `CLAUDE.md` for the authority-precedence list.

**Last updated:** 2026-09-16
**Phase status:** Phase B (backend) complete · Phase C (frontend platform) executed · FE libs modernize complete · Admin Remote UI complete · App launcher + nested nav tree shipped

---

## 1. What this repository is

A production-shaped micro-frontend platform:

- **One origin.** The browser only ever talks to Caddy on `:8080`. There is no `:3000`, `:5173`, `:5174` or
  `:5175` in the address bar during the happy path.
- **Cookie session management.** The access token lives in memory only; the refresh token is an HttpOnly cookie.
- **Scope-gated remote registry.** MFE configs carry scope requirements and route metadata; the shell launcher loads
  only the remotes the current user is entitled to. Per-app nested menus are a separate lazy API.

It is explicitly *not* a widget-style demo: no `localStorage` tokens, no `?token=` URLs, no event bus.

---

## 2. Top-level map

Source file counts are approximate, measured over `*.ts,*.tsx,*.js,*.jsx,*.cjs,*.mjs,*.json` and exclude
`node_modules/` and `dist/`.

| Path | What it is | Package manager | Size (approx.) |
|------|-----------|-----------------|----------------|
| `backend/` | NestJS API — auth, scopes, users, MFE registry | pnpm | ~9,550 LOC / 173 files |
| `packages/mfe-sdk/` | Internal SDK: auth, HTTP client, remote loader | pnpm | ~1,280 LOC / 17 files |
| `packages/mfe-ui/` | Shared MUI theme + layout kit + widgets | pnpm | `@mfe/ui` + `@mfe/ui/widgets` |
| `landing/` | Public app — login, register, home | **npm** | ~480 LOC / 13 files |
| `shell/` | Authenticated host — Home launcher, API nav tree, lazy remotes | pnpm | — |
| `remotes/demo-react/` | Federated React remote | pnpm | product/article multi-expose |
| `remotes/admin-react/` | ADMIN remote — user & scope management UI | pnpm | ~520 LOC |
| `remotes/demo-vue/` | Federated Vue remote — Tailwind dashboard; standalone dual-mode SessionGate | pnpm | D1–D2 + SessionGate |
| `gateway/` | Caddy config only (no package.json) | — | — |
| `docs/` | Documentation (this file included) | — | — |
| `plans/` | Dated execution plans | — | — |
| `scripts/` | Repo-level helper scripts | — | — |

Root-level files worth knowing: `Makefile`, `docker-compose.yml`, `docker-compose.infra.yml`, `.dockerignore`,
`.dev-bin/env.sh` (toolchain pinning), `.env.example`, `CLAUDE.md`, `README.md`.

> **Note:** `landing/` is the only app using **npm** (`package-lock.json`). It has no pnpm lockfile
> by design; the other three use pnpm with lockfiles.

---

## 3. Backend (`backend/`)

NestJS 10 on Express, with Postgres 16 via TypeORM 0.3 (hand-written SQL migrations, `synchronize: false`)
and Redis for caching plus the session blacklist.

### 3.1 Module inventory

| Module | Path | Role |
|--------|------|------|
| Auth | `src/api/auth/` | Login, register, refresh, logout; cookie handling; token blacklist |
| User | `src/api/user/` | Users, sessions, `/me`, admin CRUD, change-password |
| Scope | `src/api/scope/` | Scope catalogue (ADMIN-only CRUD) |
| MFE config | `src/api/mfe-config/` | Remote registry: entries, `iconUrl`, scope bindings, `accessible` + per-config nav tree |
| Post | `src/api/post/` | Example CRUD module kept from the NestJS starter. Present on disk but **not registered** in `ApiModule`, so its routes are dead code (`GET /api/v1/posts` → 404) |
| Health | `src/api/health/` | Liveness/readiness (`/health`, excluded from the API prefix) |
| Home | `src/api/home/` | Root `/` welcome route |
| Background | `src/background/queues/email-queue/` | BullMQ (`@nestjs/bullmq`) email queue + processor |
| Mail | `src/mail/` | Mailer service with templates |
| Redis | `src/redis/` | Cache/blacklist client config |
| Libs | `src/libs/aws/`, `src/libs/gcp/` | Cloud provider stubs |
| i18n | `src/i18n/{en,jp,vi}/` | Translation catalogues |

Cross-cutting: `src/guards/` (`AuthGuard`, `ScopesGuard`), `src/decorators/` (`@Public`, `@AuthOptional`,
`@CurrentUser`, `@RequireScopes`), `src/filters/global-exception.filter.ts`, `src/constants/error-code.constant.ts`,
`src/utils/configure-app.ts` (prefix, versioning, CORS, validation, guards, filters).

### 3.2 HTTP surface

Global prefix from `app.apiPrefix` plus URI versioning yields `/api/v1/...`. `/` and `/health` are excluded
from the prefix.

| Controller | Base path | Notes |
|-----------|-----------|-------|
| `auth` | `/api/v1/auth` | `email/login`, `email/register`, `logout`, `refresh` are live. `forgot-password`, `verify/forgot-password`, `reset-password`, `verify/email`, `verify/email/resend` are **stubs** returning static strings — endpoint only, no mail flow and no UI. |
| `users` | `/api/v1/users` | `GET /me` and `POST /me/change-password` for the current user; everything else is `@RequireScopes(ADMIN)`. |
| `mfe-configs` | `/api/v1/mfe-configs` | `GET /accessible` (optional `iconUrl`; declared *before* `GET /:id`); `GET /by-route/:routeName/nav/accessible` (lazy tree; 404 if config not accessible). ADMIN: CRUD + `/:id/nav-items` (+ `PATCH …/reorder`). |
| `scopes` | `/api/v1/scopes` | All routes `@RequireScopes(ADMIN)`. |
| `health` | `/health` | Unprefixed; `@Public()`. |

Swagger is mounted at `/api/docs` in development only, and `GET /api/docs-json` is the quickest way to confirm
the mounted route list. There is **no** `/api/v1/posts` route.

### 3.3 Auth and cookie model

- **Access token:** HS256 JWT, 15-minute lifetime, returned in the response body and held **in memory** by the
  browser client. Never persisted.
- **Refresh token:** delivered as an HttpOnly cookie (`REFRESH_COOKIE`), `Path=/`, `SameSite=Lax`, `Secure`
  when production, `maxAge` derived from config. JavaScript cannot read it.
- **Refresh flow:** `POST /api/v1/auth/refresh` reads the cookie, re-issues an access token and rotates the
  cookie. The response body carries `{ userId, accessToken, tokenExpires }` — the refresh token is **not**
  in the body.
- **Logout:** clears the cookie and blacklists the session in Redis, so the next request fails with 401.
- **Authorization is scope-only.** There is no roles or permissions table. `ADMIN` is simply the scope named
  `ADMIN`. Critically, **ADMIN does not bypass `accessible`** — it only sees configs whose scopes intersect its
  own. Reading the full registry is a separate ADMIN-only endpoint.
- **Revocation lag — with one important exception.** `@RequireScopes` endpoints read the scope list from the
  **access token**, so a grant or revocation can take up to 15 minutes (until the token refreshes) to take
  effect there. `GET /api/v1/mfe-configs/accessible` is different: it re-reads the user's scopes from the
  **database** on every call, so the shell's launcher list reflects scope changes immediately. The lazy nav
  endpoint re-reads the same way (and 404s if the config is no longer accessible).

### 3.4 Data layer

Entities: `user`, `session`, `scope`, `user_scope` (join), `mfe_config`, `mfe_config_scope` (join),
`mfe_nav_item`, `mfe_nav_item_scope` (join), plus `post` and the `abstract.entity` base.

Migrations (hand-written, ordered by timestamp) live in `src/database/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `1721488504685-create-user-table` | Base users table |
| `1721550180313-create-session-table` | Sessions |
| `1722352657866-create-post-table` | Example post table |
| `1789171200000-create-scope-table` | Scopes |
| `1789171200001-create-user-scope-table` | User ↔ scope join |
| `1789171200002-create-mfe-config-tables` | MFE config + scope join |
| `1789171200003-add-mfe-config-route-metadata` | `routeName`, `title`, `framework` columns |
| `1789171200004-mfe-config-multi-surface-uniques` | Unique constraints for multi-surface remotes |
| `1789171200005-mfe-nav-item-and-icon-url` | `mfe_config.icon_url`; `mfe_nav_item` + `mfe_nav_item_scope` |

Seeds (`src/database/seeds/`): scopes (`ADMIN`, `DASHBOARD`), users, MFE configs — including
`productReact` entries `route_name=product` (`./Product`) and `route_name=article` (`./Article`)
on scopes `[DASHBOARD]` (asset path still `/r/demo-react/…`) — and demo nav trees
(`1722335727100-mfe-nav-item-seeder.ts`). After new migrations on a long-lived `make up` volume,
run `make migrate` (and `make seed` for demo trees).

Seeded development accounts: `admin@example.com` / `12345678` and `dashboard@example.com` / `12345678`.

> Seeded credentials are development fixtures only. They are not appropriate for any deployed environment.

---

## 4. `packages/mfe-sdk`

The internal SDK consumed by the shell and every remote via `file:` dependencies. It is **not published to npm**
in this phase, and it is shared through Module Federation as a singleton so that all federated code shares one
in-memory access token.

### 4.1 Public surface

Exports from `src/index.ts`:

| Export | Kind | Purpose |
|--------|------|---------|
| `login`, `register`, `refresh`, `logout` | async fns | Auth calls |
| `getAccessToken`, `clear` | fns | Read/clear the in-memory access token |
| `api` | object | HTTP facade: `get`, `post`, `put`, `patch`, `delete` |
| `setRedirect` | fn | Override where an unrecoverable 401 sends the user |
| `toApiError` | fn | Normalise an unknown thrown value into `ApiError` |
| `ApiError` | class | `{ status, body, message }`; `status === 0` means transport failure |
| `registerRemotes`, `loadRemote`, `toRuntimeEntry` | async fns | Federation helpers |
| `safeNext` | fn | Sanitise a `?next=` redirect target |
| `MfeRemoteRef`, `RemoteModule`, `MfeAccessibleItem`, `MfeNavNode`, `AuthResponse`, `RegisterResponse` | types | Shared contracts (`iconUrl?` on accessible; nav tree nodes) |

### 4.2 Internals

| File | Role |
|------|------|
| `src/http.ts` | Two axios instances, both `withCredentials: true`. `http` injects the Bearer header and performs **one** deduped 401 refresh-and-retry; `authHttp` is bare and is used for auth calls so a wrong-password 401 cannot start a refresh loop. |
| `src/token.ts` | Dependency-free, memory-only access-token store. Exists to break the former `auth ↔ http` import cycle. |
| `src/errors.ts` | `ApiError`. |
| `src/api.ts` | Thin facade over `http`; maps rejections through `toApiError`. |
| `src/auth.ts` | Auth calls over `authHttp`, with an in-flight `refreshInflight` promise for dedupe. |
| `src/remote.ts` | `toRuntimeEntry`, `registerRemotes`, `loadRemote`. |
| `src/next.ts` | `safeNext`. |
| `src/types.ts` | Shared type contracts. |
| `src/testing/axios-adapter.ts` | Scripted axios adapter used by the spec files. |

**Contract worth memorising:** `api.*` resolve an `AxiosResponse<T>`, so callers read `res.data`; they reject
an `ApiError`. The raw `http` instance is deliberately not exported.

---

## 5. Frontend applications

All three are React 18.3 + Vite 5 + MUI 6 on a shared theme approach, using `react-router-dom` 6.

### 5.1 `landing/` — public

Standalone Vite app — **not** a Module Federation remote (it has no `federation()` plugin) and not currently
a host either. Package manager: **npm**.

- `src/main.tsx`, `src/App.tsx`, `src/theme.ts`
- `src/pages/{Home,Login,Register}.tsx`
- `src/schemas/auth.ts` — zod schemas (`loginSchema`, `registerSchema`)

Login and Register use `react-hook-form` with `zodResolver` and MUI `Controller` rather than hand-rolled
`FormData` handling.

### 5.2 `shell/` — authenticated host

- `src/auth/Gate.tsx` — boot: `refresh()` → `accessible` → `registerRemotes`; after ready, `focus` / `visibilitychange` call `refreshAccessibles` (never leaves `status: 'ready'`)
- `src/context/RemoteContext.tsx` — `{ userId, accessibles, refreshAccessibles, isRefreshing }`
- `src/context/NavContext.tsx` — lazy `GET …/by-route/:routeName/nav/accessible`; memory cache; invalidate on accessible refresh
- `src/context/NotifyContext.tsx` — shell Snackbar channel for remote `onNotify`
- `src/layout/ShellLayout.tsx` — AppBar + Apps popover + per-app nested drawer (hidden on `/app` index)
- `src/pages/HomeLauncher.tsx` — `/app` widget grid from `accessibles` (`iconUrl?`)
- `src/pages/{RemoteOutlet,Unsupported,NotFound}.tsx` — mount point (`:routeName/*`), unsupported-framework page, 404
- `src/App.tsx` — `BrowserRouter basename="/app"`; index → HomeLauncher; `:routeName/*` splat for deep-links

Remotes are declared in Module Federation `shared` as singletons: `react`, `react-dom`, `@mfe/sdk`, MUI,
emotion, and `react-hook-form`. **axios is intentionally not shared** — it is an SDK implementation detail.

Root `package.json` (repo root) is **dev tooling only** (puppeteer / `npm run test:e2e`); no `workspaces`.

### 5.3 `remotes/demo-react/` (product / article bundle)

- `src/ProductApp.tsx` — Product nested routes + Article hub app
- `src/exposes/product.tsx` / `article.tsx` — each `{ mount, unmount }` with its own root
- `src/main.tsx` — standalone SessionGate → Product only (`remoteName=productReact`)

### 5.4 `remotes/admin-react/` (Phase D5 ✓)

- `src/components/` — user/scope/config CRUD forms + nav tree editor (`configs/:id/nav`)
- `src/lib/jwt-scopes.ts` — extract scopes from shared SDK token; SoftGate pattern
- `src/AdminApp.tsx` — root component; SoftGate + nested routes; NotifyProvider
- `src/expose.tsx` — exposes `{ mount, unmount }`; consumes `{ basePath, routeName, onNotify? }`
- `src/main.tsx` — standalone dev entry (no `onNotify`)
- Config create/edit include optional HTTPS `iconUrl`; list links to the nav editor
- List pages keep `page` in the URL query string (`?page=`)

The remote contract is `{ mount, unmount }` with mount ctx `{ basePath, routeName, locale?, onNotify? }` —
no token, no user object, no event bus. `demo-react` ignores ctx; `admin-react` uses routing + optional
`onNotify` for Snackbar feedback (does not trigger `accessible` refetch).

---

## 6. Gateway (`gateway/`)

Caddy configuration only — no package, no build step.

| File | Used by | Routing |
|------|---------|---------|
| `Caddyfile` | Hybrid local dev | `/api*` → `localhost:3000`, `/app*` → `localhost:5174`, `/r/demo-react*` → `localhost:5175`, everything else → `localhost:5173` |
| `Caddyfile.compose` | Docker Compose | Same routes, addressed by compose service names |
| `Caddyfile.docker` | Kept variant | — |

---

## 7. Toolchain, ports, and package managers

`.dev-bin/env.sh` pins **Node 20.18.0** and puts a workspace-local **pnpm 9.12.3** on `PATH`. Source it in
every shell before running node tooling.

| Service | Host port | Notes |
|---------|-----------|-------|
| Gateway (Caddy) | `8080` | The only address the browser should use |
| Backend | `3000` | Direct access for debugging only |
| landing / shell / demo-react dev servers | `5173` / `5174` / `5175` | Behind the gateway in normal use |
| Postgres | `25432` | Database `mfe_backend`. Published only by `make infra` (`docker-compose.infra.yml`); the full-stack compose publishes no DB port. |
| Redis | `6379` | — |

Docker Compose services: `db`, `redis`, `backend`, `landing`, `shell`, `demo-react`, `gateway`, on the `mfe`
bridge network. The three frontend services run the **`development` Dockerfile target** with source bind-mounts
(including `packages/mfe-sdk/src`), so editing SDK source hot-reloads inside the containers.

Because the SDK is mounted as source, each frontend image must also install the SDK's **own** runtime
dependencies — currently `axios`. All three Dockerfiles do this explicitly; without it, Vite fails to resolve
`axios` in the container.

---

## 8. Tests and verification

| Scope | Command | Current state |
|-------|---------|---------------|
| Backend unit | `cd backend && pnpm test` | 236 tests passing |
| SDK | `cd packages/mfe-sdk && pnpm test` | 60+ tests (auth/api/next/remote + location-sync + path-utils) |
| Typecheck | `npm run typecheck` (landing) / `pnpm typecheck` (shell, demo-react) | `tsc -b --noEmit`; a no-op root tsconfig is not sufficient |
| Build | `npm run build` (landing) / `pnpm build` (shell, demo-react) | — |
| Gateway smoke | `make smoke` | 4 gateway routes plus a direct `/health` check |
| End-to-end | `scripts/e2e-demo-remote.mjs` | Drives the federated remote end to end |

Backend integration tests need a live Postgres; `backend/.env.example` documents the expected variables.

---

## 9. Related documents

| Document | Use it for |
|----------|-----------|
| `README.md` | Project overview and quick start |
| `CLAUDE.md` | Agent-facing authority, locked stack, non-goals |
| `docs/system-architecture.md` | Layer design, contracts, data flow |
| `docs/code-standards.md` + `-backend` / `-frontend` / `-sdk` | Conventions. The HTTP and forms rules live in `code-standards-frontend.md` §2.4/§2.9; the SDK layer in `code-standards-sdk.md` §3.4 |
| `docs/local-development-guide.md` | Running the stack locally (Docker and hybrid) |
| `docs/deployment-guide.md` | Docker, Caddy, and deployment |
| `docs/project-roadmap.md` | Phase timeline and milestones |
| `docs/project-overview-pdr.md` | Requirements and deliverables |
| `docs/brainstorm/` | Historical specs — read-only context, never edited. App launcher / nav tree: `2026-09-16-app-launcher-nav-tree-spec.md` |
| `packages/mfe-sdk/README.md` | SDK usage and its axios-based contract |
