# Micro-Frontend Fullstack Platform

A production-shaped micro-frontend (MFE) platform built with **NestJS backend**, **React 18 shell**, and **Module Federation** remotes. Same-origin architecture via Caddy gateway, cookie-based session refresh, and scope-gated access control.

> **Status:** Phase B (backend) ✓ | Phase C (frontend) ✓ | FE libs modernize ✓ | Admin Remote UI ✓

---

## Quick Overview

This is a **single git repo** (solo-dev monorepo) with **package folders** kept split-ready for a future polyrepo:

| Package folder | Tech | Status | Purpose |
|----------------|------|--------|---------|
| `backend/` | NestJS 10, Postgres, Redis | **shipped** ✓ | Auth, users, scopes, MFE registry |
| `landing/` | React 18 + Vite + MUI 6 | **shipped** ✓ | Public landing + login + register |
| `shell/` | React 18 + Vite + MUI 6 | **shipped** ✓ | Authenticated app shell, remote nav |
| `remotes/demo-react/` | React 18 + Vite | **shipped** ✓ | Stub federation remote (proves contract) |
| `remotes/admin-react/` | React 18 + Vite | **shipped** ✓ | ADMIN CRUD remote (users, scopes, configs) |
| `packages/mfe-sdk/` | TypeScript + Vite | **shipped** ✓ | Shared auth + API + federation client |
| `gateway/` | Caddy + docker-compose | **shipped** ✓ | Origin proxy & dev routing (not a future extract target) |

**Future split:** when a team owns a surface, extract that folder into its own remote. Keep boundaries clean (no cross-folder imports except `@mfe/sdk` via `file:`). All frontend apps ship under one `:8080` origin via Caddy in dev/prod.

---

## Port Map (Dev)

| Service | Dev Port | Caddy path | Notes |
|---------|----------|------------|-------|
| **Caddy gateway** | `:8080` | — | Single browser origin; all traffic enters here |
| **Landing** | `:5173` | `/` (catch-all) | Public: landing, register, login |
| **Shell MFE** | `:5174` | `/app*` | Authenticated; scope-gated remote nav |
| **Demo React remote** | `:5175` | `/r/demo-react*` | Federation remote; DASHBOARD scope required |
| **Admin React remote** | `:5176` | `/r/admin-react*` | Federation remote; ADMIN scope required |
| **NestJS backend** | `:3000` | `/api*` | REST API; Swagger at `/api/docs` (dev only) |
| **Postgres** | `:25432` | — | Host port only via `make infra` (`docker-compose.infra.yml`); base compose publishes **no** DB host port |
| **Redis** | `:6379` | — | Docker; session/access-token blacklist + cache (sessions live in Postgres) |

---

## Architecture

Same-origin Caddy `:8080` fans out to landing (`:5173`), shell (`:5174`), demo-react (`:5175`), admin-react (`:5176`) and backend (`:3000`) — the port map above is authoritative. In the happy path the browser only ever sees `http://localhost:8080`.

> Layer design and data flow: [docs/system-architecture.md](./docs/system-architecture.md) · module inventory: [docs/codebase-summary.md](./docs/codebase-summary.md).

### Auth Flow

1. **Register** → `POST /api/v1/auth/email/register` → user created → redirect `/login`
2. **Login** → `POST /api/v1/auth/email/login`
   - Response: `{ userId, accessToken, tokenExpires }`
   - Cookie: `refresh_token` (HttpOnly, SameSite=Lax, no JS access)
   - Redirect: `/app` (or `?next=` path if valid)
3. **Shell boots** → `POST /api/v1/auth/refresh` (uses cookie) → refresh access token
4. **Remote mounts** → Uses `@mfe/sdk` (in-memory access token, shared singleton)
5. **Logout** → `POST /api/v1/auth/logout` → blacklist session → redirect `/login`

**Key:** Refresh token lives **only** in cookies; access token lives **only** in memory. No tokens in `localStorage` or URLs.

---

## Phase Overview

### Phase B: Backend (Complete ✓)

NestJS auth service: email/password login + refresh tokens (Redis blacklist), scope-only authorization (no Role/Permission tables), admin = owns `ADMIN` scope, and an MFE config registry gated by scope. Seed: `admin@example.com` / `12345678` (ADMIN scope).

**Ref:** [Backend README](./backend/README.md) · [Phase B Spec](./docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-spec.md) · [Implementation Notes](./docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md)

### Phase C: MFE Platform (Complete ✓)

Frontend platform with cookie-based refresh, MUI landing/shell, React demo remote, and unified `@mfe/sdk`:

- **P1:** Backend cookie + MfeConfig metadata (routeName, title, framework) ✓
- **P2:** `@mfe/sdk` (auth + API + federation client) ✓
- **P3:** Caddy gateway (`:8080` routing) ✓
- **P4:** Landing (public, register/login) ✓
- **P5:** Shell (authenticated, remote nav) ✓
- **P6:** Demo React remote (stub, proves contract) ✓
- **P7:** Smoke tests + repo hygiene ✓

**Ref:** [Phase C Spec](./docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md) · [Codebase Summary](./docs/codebase-summary.md) · [FE libs modernize plan](./plans/260913-2118-fe-libs-modernize/plan.md) (status: completed). The earlier per-phase Phase C execution plan (`260913-1735-phase-c-mfe-platform/`) was consolidated away and its path no longer exists.

### Admin Remote UI (Phase D5) ✓

Federation remote `remotes/admin-react` — `routeName=admin`, gateway `/r/admin-react*` → `:5176`, scopes `[ADMIN]`. Admin login sees **Admin** in shell nav; CRUD for users, scopes, and MfeConfigs. Plan: [`plans/260913-2113-admin-remote-ui/plan.md`](./plans/260913-2113-admin-remote-ui/plan.md).

### Later (Not Scheduled)

Vue remotes, Angular remotes, pages/route ACL, RBAC, MinIO, npm publish, umbrella CI — see [Non-Goals](#non-goals-explicitly-out).

---

## Getting Started

> **Docker (one command):** `make up` → http://localhost:8080 — see [docs/local-development-guide.md](./docs/local-development-guide.md). **Makefile:** `make help` (`up`, `down`, `infra`, `logs`, `smoke`, `reset`, …)

### Prerequisites

- Docker + Docker Compose v2 (for `make up` / `make infra`)
- Host work: source the pinned toolchain first — `. .dev-bin/env.sh` (Node 20.18.0 + pnpm 9.12.3) — plus Caddy 2.x if running the gateway on the host (`brew install caddy`; see [gateway/README.md](./gateway/README.md))
- **Package managers differ by app:** `landing/` uses **npm** (`package-lock.json`, no pnpm lockfile); `shell/`, `remotes/demo-react/`, `remotes/admin-react/` and `packages/mfe-sdk/` use **pnpm**. There is no root `package.json` and no pnpm workspace.
- Optional: copy root `.env.example` → `.env` to override ports/passwords

### Full stack via Docker

```bash
make up      # db + redis + backend + landing + shell + demo-react + caddy
make smoke   # 4 gateway route checks (/, /api/docs, /app/, /r/demo-react/remoteEntry.js) + direct /health
# Browser: http://localhost:8080
# Seed: dashboard@example.com / 12345678
```

### Backend on host (hybrid)

```bash
. .dev-bin/env.sh                       # Node 20.18.0 + pnpm 9.12.3
make infra                              # Postgres :25432 + Redis :6379 only
cd backend && cp .env.example .env      # set a fresh AUTH_JWT_SECRET
pnpm install --frozen-lockfile
pnpm migration:up && pnpm seed:run
pnpm start:dev                          # API :3000 · Swagger /api/docs · health /health
```

**Seed user:** `admin@example.com` / `12345678` (ADMIN scope) — **dev only**

### Frontend apps on host (all shipped)

```bash
cd gateway && caddy run --config Caddyfile           # single origin :8080 (recommended; keeps Vite HMR)
cd landing && npm install && npm run dev             # :5173  (npm)
cd shell && pnpm install && pnpm dev                 # :5174  (pnpm)
cd remotes/demo-react && pnpm install && pnpm dev    # :5175  (pnpm)
cd remotes/admin-react && pnpm install && pnpm dev   # :5176  (pnpm)
```

> **Browser entry point:** `http://localhost:8080` (NOT `:3000`, `:5173`, etc.) — see [gateway/README.md](./gateway/README.md) for the Docker Compose alternative and Vite HMR notes.

**Routes:** `/` → landing · `/app` → shell (authenticated) · `/app/:routeName` → lazy-loaded remote (seeded: **`/app/demo`**) · `/api/v1/...` → NestJS · `/r/demo-react/...` → demo remote

**Seed credentials (dev only):** `admin@example.com` / `12345678` (ADMIN) · `dashboard@example.com` / `12345678` (DASHBOARD — sees the Demo React remote)

> Full local walkthrough (Docker + hybrid, in Vietnamese): [docs/local-development-guide.md](./docs/local-development-guide.md).

---

## Authorization Model

**Scope-only:** Users own zero or more named scopes (e.g., `ADMIN`, `DASHBOARD`). No role or permission tables.

```
user ──< user_scope >── scope ──< mfe_config_scope >── mfe_config

accessible(user) = mfe_config WHERE scopes(mfe_config) ∩ scopes(user) ≠ ∅
```

- Admin routes guarded by `@RequireScopes(ADMIN_SCOPE)`
- **`ADMIN` scope does NOT bypass `accessible` intersection** — even admins see only configs they have scope overlap with
- Scope checks read the **access token** (not DB), so grants lag up to 15 minutes until next refresh
- **`POST /api/v1/auth/logout` is the only instant revocation** (blacklists session in Redis)

**Seeded scopes:** `ADMIN` (admin users), `DASHBOARD` (dashboard app; demo user owns this)

---

## Key Decisions Locked

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Origin** | Same-origin via Caddy `:8080` | Simplifies cookies, CORS, session model |
| **Access token** | In-memory (session) only | Short-lived (15m); revoked on logout |
| **Refresh token** | HttpOnly cookie only | XSS-safe; no JS access; rotated per refresh |
| **Federation** | `@module-federation/vite` 1.16.6 | Runtime remotes, shared singleton `@mfe/sdk` |
| **Route metadata** | On `MfeConfig` entity | Lazy-load remotes; extensible for ACL |
| **Remote auth** | Via shared `@mfe/sdk` singleton | All remotes inherit shell's session; no per-remote auth |
| **UI kit** | MUI 6 + React 18.3 | Material Design; matched across landing + shell + remotes |
| **Workspace** | Solo monorepo, split-ready folders | One git root now; extract `backend/`, `landing/`, `shell/`, `remotes/*`, `packages/*` later |
| **Admin bypass** | None | Intersection applies to all users, including ADMIN |

---

## Code Standards

### Backend (`backend/`)

NestJS 10 (`@nestjs/common` + Express adapter); modules auth, user, scope, mfe-config, health. TypeORM 0.3 + Postgres 16 with **hand-written migrations only** (`synchronize: false`). HS256 JWT, access 15m, refresh cookie. `@RequireScopes` + `ScopesGuard`; global exception filter (400/401/403/404/409/422); class-validator `ValidationPipe` (422 on bad input).

**Reference:** [Backend README](./backend/README.md) · [Backend Code Standards](./docs/code-standards-backend.md)

### Frontend (`landing/`, `shell/`, `remotes/demo-react/`)

- **React 18.3 + Vite 5.x + MUI 6** (same major on all three apps)
- **Pinned stack:** react-router-dom 6.x · forms react-hook-form `^7.88` + `@hookform/resolvers` `^5.9` + zod `^4.6` · hooks usehooks-ts `^3.1`
- **Module Federation:** `@module-federation/vite` 1.16.6 (pinned; do not bump)
- **SDK usage:** `import { api, login, refresh, loadRemote } from '@mfe/sdk'`
- **No tokens in logs, URLs, or localStorage**
- **Cookie flags:** `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` (prod only)

**Reference:** [Frontend Code Standards](./docs/code-standards-frontend.md) · [System Architecture](./docs/system-architecture.md)

### SDK (`packages/mfe-sdk/`)

- **TypeScript client library**
- **Exports:** auth (`login`, `register`, `refresh`, `logout`), `api` (axios wrapper), `ApiError`, `loadRemote`, `getAccessToken`
- **HTTP boundary:** apps must **never** `import axios` — they use `api.*` (or the auth helpers) so Bearer injection, the deduped 401 refresh-and-retry and the login redirect keep working. axios `^1.20` is a runtime dependency of `@mfe/sdk` **only**, and is deliberately **not** in federation `shared`.
- **`api.*` contract:** resolves an `AxiosResponse<T>` (read `res.data`) and rejects `ApiError { status, body, message }`; `status === 0` means the request never reached the server (transport failure).
- **Shared singleton:** consumed by shell + remotes via `shared` config
- **No local storage:** memory-only access token; cookie-only refresh
- **Tests:** 44 vitest unit tests across 4 spec files (`pnpm test`); landing/shell/demo-react have no `test` script at all. The browser end-to-end check lives at the repo root: `node scripts/e2e-demo-remote.mjs`.

---

## Documentation Map

| File | Purpose |
|------|---------|
| **[README.md](./README.md)** | This file — project overview, quickstart, architecture |
| **[CLAUDE.md](./CLAUDE.md)** | Agent guidance: authority precedence, tech stack, non-goals |
| **[docs/project-overview-pdr.md](./docs/project-overview-pdr.md)** | Functional spec + requirements + success metrics |
| **[docs/codebase-summary.md](./docs/codebase-summary.md)** | High-level codebase structure & module inventory |
| **[docs/code-standards.md](./docs/code-standards.md)** + [backend](./docs/code-standards-backend.md) · [frontend](./docs/code-standards-frontend.md) · [SDK](./docs/code-standards-sdk.md) | Conventions, naming rules, patterns — a hub plus per-area satellites |
| **[docs/system-architecture.md](./docs/system-architecture.md)** | Technical architecture: layers, data flow, integration points |
| **[docs/project-roadmap.md](./docs/project-roadmap.md)** | Phase timeline, milestones, deliverables |
| **[Makefile](./Makefile) · [docker-compose.yml](./docker-compose.yml)** | `up` / `infra` / `smoke` and the full-stack Compose (db, redis, api, FE, caddy) |
| **[docs/local-development-guide.md](./docs/local-development-guide.md) · [docs/deployment-guide.md](./docs/deployment-guide.md)** | Local run (Docker + hybrid, tiếng Việt) and Docker/Caddy/deployment |
| **[docs/brainstorm/](./docs/brainstorm/)** | Preserved: Phase B spec + notes, Phase C spec |
| **[plans/](./plans/)** | `260913-2118-fe-libs-modernize/` (completed) · `260913-2113-admin-remote-ui/` (pending — next up) |

---

## Security Notes

- **Secrets:** `.env`, `.env.docker`, `.env.test` are gitignored — never commit
- **CORS:** Explicit allow-list via `APP_CORS_ORIGIN` (credentials enabled)
- **Database:** `DATABASE_SYNCHRONIZE: false` — schema changes via reviewed migrations only
- **Session blacklist:** Redis tracks revoked tokens; logout is instant
- **Scope staleness:** Access token cached for 15m; refresh is the only way to pick up new grants (or immediate logout revokes)
- **Tokens in URLs/logs:** Forbidden — they appear in browser history and server logs
- **CSRF:** Same-origin gateway + SameSite=Lax cookies mitigate CSRF; explicit CSRF tokens not needed this phase

---

## Troubleshooting

### Backend

| Issue | Solution |
|-------|----------|
| "DATABASE_URL not set" | Copy `.env.example` to `.env` and fill in Postgres credentials |
| Port 3000 in use | Change `APP_PORT` in `.env` or `kill -9 $(lsof -t -i :3000)` |
| "password authentication failed" | Check Docker compose; run `docker compose logs db` |
| E2E fails with "test database does not exist" | Run `pnpm db:create:test && pnpm migration:up:test` |
| Tests hang | Check if Redis is running; `docker compose ps` should show `redis` healthy |

### Frontend (shipped)

| Issue | Solution |
|-------|----------|
| `:8080` shows "no routes" | Ensure Caddy is running; `docker compose ps` in `gateway/` |
| Login succeeds but `/app` shows 401 | Hard refresh; ensure `refresh_token` cookie exists (DevTools) |
| Remote does not load | Check `/r/demo-react/mf-manifest.json` in the Network tab and that demo-react's Vite server is up. `toRuntimeEntry()` in the SDK rewrites a `remoteEntry.js` entry to `mf-manifest.json`; loading raw `remoteEntry.js` as a classic script causes **RUNTIME-008** |
| Tokens in localStorage | This is a bug — the SDK never writes to localStorage. `getAccessToken()` is a **top-level** `@mfe/sdk` export (not an `api.*` method); debugging only |

---

## Non-Goals (Explicitly Out)

- **Vue/Angular remotes** — platform locked to React remotes (Phase C); wrappers in shell later
- **Widget view / event bus** — app-view only; channels not implemented
- **Pages / per-route ACL** — out; scopes gate configs, not routes
- **RBAC / permissions table** — scope-only model permanent
- **MinIO / artifact uploads** — deferred
- **RS256 on remoteEntry** — not gating remotes; entitlement via `accessible` only
- **npm publish of `@mfe/sdk`** — `file:` deps for Phase C; publish = later TODO
- **Umbrella as git repo** — stays a workspace folder only
- **Gateway as git repo** — Caddyfile + compose only, tracked separately if needed

---

## References

**Phase B:** [Implementation Notes](./docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md) — where code diverges from spec · [Backend README](./backend/README.md)

**Phase C:** [Spec](./docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md) — decisions, data flow, interfaces · [Codebase Summary](./docs/codebase-summary.md). The Phase C execution plan (`260913-1735-phase-c-mfe-platform/`, including its scout report) was consolidated away — those paths no longer exist.

**FE libs modernize (completed):** [`plans/260913-2118-fe-libs-modernize/plan.md`](./plans/260913-2118-fe-libs-modernize/plan.md)
**Admin remote UI (Phase D5):** [`plans/260913-2113-admin-remote-ui/plan.md`](./plans/260913-2113-admin-remote-ui/plan.md)

**Dev scripts:** per-repo `package.json`. Backend `pnpm install && pnpm start:dev`; landing `npm install && npm run dev`; shell/demo-react/admin-react/SDK `pnpm install` then `dev` (or `pnpm test` in the SDK); gateway `docker compose up` in `gateway/`.

---

## License

No `LICENSE` file exists at the repo root, so no license is currently granted. Earlier drafts of this README said "MIT"; that claim was not backed by a file.

---

**Last updated:** 2026-09-13 | **Status:** Phase B ✓ Phase C ✓ FE libs modernize ✓ Admin Remote UI (D5) ✓ — Vue/Angular remotes remain explicit non-goals.
