# Claude Agent Guidance — Micro-Frontend Fullstack Platform

This document provides agents and developers with the essential mental model, authority hierarchy, and constraints for working on this project.

---

## Project Identity

**Production-shaped micro-frontend (MFE) platform:** Same-origin host (Caddy :8080), cookie session management, scope-gated remote registry. **Not** a viblo-style widget demo or localStorage-token experiment.

**Phase Status:**
- Phase B (Backend) ✓ Complete — NestJS auth, scopes, MFE registry
- Phase C (Frontend) ✓ Executed — landing, shell, React demo remote, gateway, `@mfe/sdk` all exist and run
- FE libs modernize ✓ Complete — axios inside `@mfe/sdk`, react-hook-form + zod forms, usehooks-ts
- Admin Remote UI ✓ Complete — `remotes/admin-react`, seed `routeName=admin` on `[ADMIN]`, gateway `:5176`

---

## Authority Precedence

When information sources conflict, trust in this order:

1. **Running code** — `backend/src/` is ground truth for auth/scopes/MFE registry; each frontend app's `src/` is ground truth for frontend behaviour
2. **Phase B implementation notes** (`docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`) — where code corrected the spec
3. **Executed plans** (`plans/260913-2113-admin-remote-ui/`, `plans/260913-2241-cross-remote-state/`) — what was actually built; this supersedes any spec detail the plan changed. The older `260913-1735-phase-c-mfe-platform` and `260913-2118-fe-libs-modernize` plan folders were consolidated away and their paths no longer exist — form/HTTP rules live in `docs/code-standards-frontend.md`
4. **Phase C approved spec** (`docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md`) — locked design for frontend, except where an executed plan changed what was built
5. **Older specs** (Phase B spec, etc.) — historical context; may be superseded

**Example:** If the Phase B spec says routes are `/v1/...` but implementation notes say `/api/v1/...`, and the code confirms `/api/v1/...`, document the implementation.

---

## Tech Stack (Locked)

### Backend (`backend/`)

| Concern | Choice | Locked? |
|---------|--------|---------|
| Runtime | Node 20.18.0 | ✓ |
| Framework | NestJS 10 + Express | ✓ |
| Database | Postgres 16 + TypeORM 0.3 | ✓ |
| Migrations | Hand-written SQL, `synchronize: false` | ✓ |
| Cache / blacklist | Redis (cache-manager-ioredis-yet) | ✓ |
| Auth | HS256 JWT; access 15m; refresh **cookie** (shipped in Phase C) | ✓ |
| Authorization | Scope-only (no roles/permissions table) | ✓ |
| Docs | Swagger `/api/docs` (dev only) | ✓ |
| Logging | pino via nestjs-pino | ✓ |
| Versioning | `/api/v1/...` prefix | ✓ |

### Frontend (Locked)

| Concern | Choice | Locked? |
|---------|--------|---------|
| Runtime | Node 20.18.0 + pnpm 9.12.3 (via `.dev-bin/env.sh`) | ✓ |
| Apps | React 18.3, Vite 5.x (same major on all) | ✓ |
| UI kit | MUI 6 (landing + shell + remotes) | ✓ |
| Router | react-router-dom 6.x | ✓ |
| Federation | @module-federation/vite 1.16.6 **pinned** | ✓ |
| SDK | @mfe/sdk (internal, `file:` deps, no npm yet) | ✓ |
| HTTP client | axios ^1.20 — runtime dep of `@mfe/sdk` **only** | ✓ |
| Forms | react-hook-form ^7.88 + zod ^4.6 + @hookform/resolvers ^5.9 | ✓ |
| Hooks | usehooks-ts ^3.1 | ✓ |
| Auth client | @mfe/sdk (singleton pattern) | ✓ |
| Token storage | Access = memory only; refresh = HttpOnly cookie only | ✓ |
| Cookie flags | HttpOnly, Path=/, SameSite=Lax, Secure (prod) | ✓ |
| Gateway | Caddy (config only; no separate VCS) | ✓ |
| Workspace | Solo monorepo; folders split-ready for future polyrepo | ✓ |

**Package managers differ by app:** `landing/` uses **npm** (`package-lock.json`); `shell/`, `remotes/demo-react/`, `remotes/admin-react/`, `packages/mfe-sdk/`, and `packages/mfe-ui/` use **pnpm**. A root `package.json` exists **for repo-level dev tooling only** (e.g. puppeteer for `scripts/e2e-demo-remote.mjs`); it defines **no** `workspaces` and does not change any app's package manager. There is no pnpm workspace.

---

## Architecture Guarantees

1. **Integrated origin (:8080)** — `make up` / hybrid gateway: browser uses `http://localhost:8080` (or prod domain). **Standalone team DX** may open Vite `:517x` directly with `/api` proxy (Spec A) — shell not required.

2. **Access token memory-only** — No `localStorage`, `sessionStorage`, or URL params. Dies on page reload.

3. **Refresh token cookie-only** — HttpOnly, so JS never sees it. Sent automatically by browser on every request. Optional `COOKIE_DOMAIN` for prod parent-domain SSO; **unset locally**.

4. **Scope-only authz** — No roles, no permissions table. ADMIN = owns ADMIN scope. `@RequireScopes` endpoints read the **token**, so grants and revocations lag up to 15m until refresh — but `GET /api/v1/mfe-configs/accessible` re-reads the user's scopes from the **database** on every call, so the nav list reflects changes immediately.

5. **ADMIN does NOT bypass `accessible`** — Even admin users see only configs with scope intersection. Full registry is ADMIN-only read-all endpoint.

6. **Logout is instant** — Blacklists session in Redis; next request 401. Scope revocation lags up to 15m for token-based (`@RequireScopes`) checks only — `accessible` reflects it immediately (see guarantee 4).

7. **MfeConfig route metadata** — `routeName`, `title`, `framework` live on the entity, not hardcoded in the shell.

8. **Remote contract** — Expose `{ mount, unmount }` only (one expose file = one module-level root). Mount receives `{ basePath, routeName, locale?, onNotify? }`. Optional `locale` is a UI hint; optional `onNotify` is a **one-way** typed callback for user-facing feedback (shell Snackbar only — never refetch/`refreshAccessibles`). No token, no user object, no event bus / pub-sub. **Dual-mode:** hosted `expose` has no SessionGate; standalone `main.tsx` uses `@mfe/ui` SessionGate + LoginForm. **Hybrid multi-surface:** nest by default; extra expose + `MfeConfig` only when scopes **or** shell nav/`routeName` must split (same `remoteName` = one bundle). See `docs/code-standards-frontend.md` §2.8.1.

9. **SDK singleton** — Shared in federation `shared` config, as is `react-hook-form` (and `@tanstack/react-query` when remotes use it). Shell and all remotes use the same in-memory access token; not per-remote auth clients. Standalone apps call `setRedirectPolicy('standalone')`; shell leaves default `'shell'` (`safeNext` → `/app…`).

10. **No viblo patterns** — Not importing `localStorage` tokens, not `?token=` on remoteEntry, not widget view, not metadata inside remote JS loaders.

11. **HTTP boundary is the SDK** — axios lives **only** in `packages/mfe-sdk`. Apps must never `import axios`; they use `api` or the auth helpers. Prefer React Query over `useEffect`+imperative loads for list/detail. `api.*` resolve an `AxiosResponse<T>` (read `res.data`) and reject `ApiError` (`status === 0` means transport failure).

---

## Repository Topology

```
micro-frontend-fullstack-2026/              # Git root (solo monorepo)
├── backend/                                # Extractable package (Phase B ✓)
│   ├── src/api/auth/
│   ├── src/api/user/
│   ├── src/api/scope/
│   ├── src/api/mfe-config/
│   └── src/database/migrations/
├── landing/                                # Extractable package (Phase C ✓, npm)
├── shell/                                  # Extractable package (Phase C ✓, pnpm)
├── remotes/demo-react/                     # Extractable package (Phase C ✓, pnpm)
├── remotes/admin-react/                    # Extractable package (Phase D5 ✓, pnpm)
├── packages/mfe-sdk/                       # Extractable package (Phase C ✓, pnpm)
├── packages/mfe-ui/                        # Shared MUI theme + layout kit + widgets (✓, pnpm)
├── gateway/                                # Caddyfile + compose (stays with umbrella)
├── scripts/                                # Repo-level scripts (e2e-demo-remote.mjs)
├── docs/
│   ├── brainstorm/                         # Preserved: specs
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md                   # hub: §4–§6 + index
│   ├── code-standards-backend.md           # §1
│   ├── code-standards-frontend.md          # §2 (incl. pins §2.11)
│   ├── code-standards-sdk.md               # §3
│   ├── system-architecture.md
│   ├── project-roadmap.md
│   ├── local-development-guide.md
│   └── deployment-guide.md
├── plans/                                  # Dated execution plans
├── .dev-bin/env.sh                         # Pins Node 20.18.0 + pnpm 9.12.3
├── Makefile                                # up / infra / smoke / migrate / seed
├── docker-compose.yml                      # Full stack behind the gateway
├── docker-compose.infra.yml                # Postgres :25432 + Redis :6379 only
├── README.md
└── CLAUDE.md
```

**Current:** one git root for solo development.  
**Later:** extract a folder → new remote when a team owns that surface. Keep import boundaries clean (`@mfe/sdk` via `file:` until publish). Do **not** nest git repos inside packages.

---

## Phase B (Backend) — Already Shipped

✓ Complete. Do **not** revisit unless frontend integration reveals a bug.

- Auth: email/password login, JWT access + refresh, Redis blacklist, refresh token as HttpOnly cookie
- Scope model: no roles/permissions; ADMIN = owns ADMIN scope
- MFE registry: scopes gate config visibility; `accessible` returns ANY-overlap
- Seed: `admin@example.com` / `12345678` owning ADMIN; `dashboard@example.com` / `12345678` owning DASHBOARD; **`product` + `article`** configs (`remoteName=productReact`, scopes `[DASHBOARD]`); `adminReact` on `[ADMIN]`
- Tests: 236 unit test blocks across 23 spec files + 40 e2e blocks across 5 suites
- Docs: `/api/docs` (Swagger, dev only)
- Email verify / forgot-password routes exist as **stubs** returning static strings

**Reference:** `backend/README.md` and `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`

---

## Phase C (Frontend) — Executed

**Effort:** ~25h planned; delivered. All components exist on disk and run.

| Deliverable | Location | Notes |
|-------------|----------|-------|
| `@mfe/sdk` | `packages/mfe-sdk/` | auth, axios-based `api`, remote loader, `safeNext` / `safeStandalonePath` |
| Landing | `landing/` | public login/register/home; `@mfe/ui` LoginForm + SessionGate; npm |
| Shell | `shell/` | authenticated host, `Gate` boot sequence, lazy remotes |
| Product remote | `remotes/demo-react/` | `productReact`: exposes `./Product` + `./Article`; standalone = Product + SessionGate |
| Admin remote | `remotes/admin-react/` | ADMIN CRUD; SoftGate + nested routes (standalone SessionGate **deferred** — follow product remote pattern) |
| Gateway | `gateway/` | Caddy, same-origin `:8080` |

**Boot sequence (`shell/src/auth/Gate.tsx`):** `refresh()` → `GET /api/v1/mfe-configs/accessible` → `registerRemotes()` → render. Any failure bounces to `/login?next=<pathname>`.

**Verified evidence:** backend 236 unit + 40 e2e tests; SDK 44 tests across 4 spec files; landing/shell/demo typecheck + build green; `make smoke` returns 200 on 4/4 gateway routes plus a direct `/health` check. A browser smoke run also observed 9/9 checks (login, zod field error on empty submit, lands on `/app`, no tokens in `localStorage`/`sessionStorage`, session survives a hard refresh, remote mounts, `/api/v1/users/me` 200, no RUNTIME-008) — that run was a session observation, not a committed script; the repo's browser check is `scripts/e2e-demo-remote.mjs`.

### FE libs modernize (shipped)

- axios replaced `fetch` **inside the SDK only**: `http` (Bearer injection + one deduped 401 refresh-and-retry) and bare `authHttp` (login/register/refresh/logout, so a bad password cannot trigger a refresh loop)
- Memory-only token store in `src/token.ts` breaks the former `auth ↔ http` import cycle
- `api.*` now resolve `AxiosResponse<T>`; failures reject `ApiError { status, body, message }`
- Landing forms use react-hook-form + `zodResolver` + MUI `Controller`; shell/demo adopt `usehooks-ts`
- `react-hook-form` added to federation `shared`; **axios deliberately not shared**

Plan: form/HTTP stack documented in `docs/code-standards-frontend.md` (former `260913-2118-fe-libs-modernize` plan consolidated away).

---

## Non-Goals (Explicitly Out of Scope)

🚫 **Do not implement:**

- Vue remotes (React only for now; Vue wrappers = later)
- Angular remotes (same as Vue)
- Widget view / event bus (app-view only)
- Pages / per-route ACL (scope-only gating of configs)
- Full RBAC / permissions table (scope model permanent)
- MinIO / artifact uploads (deferred)
- RS256 on remoteEntry (no JWT gate; entitlement = `accessible` only)
- `@mfe/sdk` npm publish (`file:` deps for now; npm publish = later TODO)
- Umbrella as git root (stays workspace folder)
- Gateway as git repo (Caddyfile + compose only)
- Landing as a federation remote (standalone Vite app)
- Email verify UI (endpoint stubs; no FE yet)
- Viblo patterns (localStorage tokens, `?token=` URLs, widget metadata)

---

## Key Rules for Agents

### Documentation Work

1. **Preserve brainstorm files** — `docs/brainstorm/` is historical truth. Never edit; only read for context.
2. **Authority comes from running code** — Whenever documenting APIs or frontend behaviour, verify against the relevant `src/` (not the spec).
3. **Document the frontend as shipped** — landing/shell/demo-react/admin-react/`@mfe/sdk` exist and run. Never describe them as "planned" or "not yet created".
4. **Cross-link consistently** — Link to brainstorm specs from public docs; link to authority sources at the top of each doc.
5. **Keep files under ~800 LOC** — If a doc exceeds that, split into subtopics, as `docs/code-standards.md` now is: a hub (§4–§6 + index) plus `code-standards-backend.md` (§1), `code-standards-frontend.md` (§2) and `code-standards-sdk.md` (§3). Section numbers were preserved across the split, so an existing `§2.9` reference now lives in the frontend satellite. (`docs/system-architecture.md` is the next split candidate.)
6. **Verify links** — Plan directories get consolidated and deleted; check that plan paths you cite still exist.

### Implementation Work (When Asked)

1. **Do not implement unless explicitly asked** — This guidance is for documentation and understanding only.
2. **Respect file ownership** — Each app owns its own files; keep `@mfe/sdk` imports as the only cross-package boundary. Do not cross boundaries between landing/shell/remotes.
3. **Use backend code as spec** — If a DTO or entity definition is needed, grep the actual code, not the spec.
4. **Pin versions deliberately** — `@module-federation/vite@1.16.6` is pinned. Do not bump without explicit user request + regression testing.
5. **Never import axios outside the SDK** — Use `api` / auth helpers so interceptors, refresh and redirect keep working.
6. **No tokens in code samples** — Examples must not show real secrets or real tokens; use placeholders like `YOUR_JWT_HERE`.

### When Things Conflict

- **Backend code vs. spec** → Believe the code; update the spec docs.
- **Phase B notes vs. Phase B spec** → Believe the notes (they were written after implementation).
- **Phase C spec vs. executed plan** → Believe the executed plan and the code for what was actually built.
- **Dated brainstorm file vs. README** → If brainstorm was meant to be archived, link to it and document what changed.

---

## Development Workflow (Current)

```bash
# Source the toolchain first in every shell (Node 20.18.0 + local pnpm 9.12.3)
. .dev-bin/env.sh

# Full stack via Docker (db, redis, backend, landing, shell, demo-react, admin-react, gateway)
make up            # build & start; browse http://localhost:8080
make smoke         # curl the gateway routes
make logs          # tail logs
make ps            # list services
make down          # stop, keep volumes

# Data
make migrate       # run migrations in the backend container
make seed          # run seeders
make reset         # down + wipe volumes + up (DESTROYS local data)

# Backend on the host (needs infra)
make infra         # Postgres :25432 + Redis :6379 only
cd backend && pnpm install --frozen-lockfile && pnpm start:dev

# Frontend apps on the host
cd landing && npm install && npm run dev            # landing uses npm
cd shell && pnpm install && pnpm dev
cd remotes/demo-react && pnpm install && pnpm dev
cd remotes/admin-react && pnpm install && pnpm dev
cd packages/mfe-sdk && pnpm test                     # 51 tests
cd packages/mfe-ui && pnpm test                      # theme + layout + auth UI + widgets
```

`make up` builds FE **`production`** static images (Caddy `:80` behind gateway) — no Vite HMR in compose.
For edit-reload DX: `make infra` + host `pnpm/npm run dev` (landing/product remote can run **without** shell; Spec A).
Dockerfiles still install `file:` package runtimes at image build (SDK: axios; UI: peers).

---

## Common Questions

**Q: Can I add a role table alongside scopes?**  
A: No. Scope-only is locked. If you need role-based features, model them as scopes (e.g., `ADMIN`, `EDITOR`, `VIEWER`).

**Q: Can I store access tokens in `localStorage` for a PWA?**  
A: No. Access = memory-only. Refresh = cookie-only. Memory dies on reload; cookie persists. This is intentional (XSS protection + session revival).

**Q: Can I use Vue 3 + Vite 5 for a remote?**  
A: Not this phase. All Vite apps are locked to React 18.3 + Vite 5 same major. Vue = later, and it must be rebuilt on `@module-federation/vite` (not the originjs plugin) — see the Phase D TODO in `docs/project-roadmap.md`.

**Q: Should I `git init` each package?**  
A: No — one git root at the umbrella for solo work. Keep packages in separate folders so a future team can extract them into their own remotes. Do not nest git repos inside packages.

**Q: Is ADMIN bypass ever allowed in `accessible`?**  
A: No. `ADMIN` scope must have intersection with config's scopes to see it. Full registry is separate read-all endpoint (ADMIN only). This is locked.

**Q: Does the refresh endpoint still return `refreshToken` in the body?**  
A: No — already shipped. It returns only `{ userId, accessToken, tokenExpires }`; the refresh token travels solely as an HttpOnly cookie.

**Q: Should I add environment detection to use `?token=` on staging?**  
A: No. Never use `?token=` on remoteEntry or any URL. Tokens belong in headers (Authorization) or cookies (HttpOnly). URL tokens show in browser history, logs, and CDN cache.

**Q: Can I call `fetch` or `import axios` in an app?**  
A: No. Use `api.*` from `@mfe/sdk`. The SDK owns the only axios instances so Bearer injection, the deduped 401 refresh-and-retry, `withCredentials`, and the login redirect all keep working.

---

## Documentation Map

| File | Audience | Purpose |
|------|----------|---------|
| **README.md** | Everyone | Project overview, quick start, architecture |
| **CLAUDE.md** | Agents + leads | This file — authority, tech stack, rules, non-goals |
| **docs/project-overview-pdr.md** | PMs + architects | Requirements, success metrics, deliverables |
| **docs/codebase-summary.md** | New developers | Codebase structure, module inventory, entry points |
| **docs/code-standards.md** (+ `-backend` / `-frontend` / `-sdk`) | Developers | Naming conventions, patterns, linting rules — hub plus per-area satellites |
| **docs/system-architecture.md** | Architects + leads | Layer design, data flow, integration contracts |
| **docs/project-roadmap.md** | PMs + leads | Phase timeline, dependencies, milestones |
| **docs/local-development-guide.md** | Developers | Chạy full stack local (Docker `make up` + hybrid) |
| **Makefile** | Developers | `make up` / `make infra` / `make smoke` |
| **docs/deployment-guide.md** | DevOps + leads | Docker, Caddy, CI/CD, production setup |
| **docs/brainstorm/** | Context only | Historical specs |
| **plans/** | Agents + leads | Dated execution plans and their status |

---

## Getting Help

- **Backend API questions** → `backend/README.md` + `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`
- **Frontend design questions** → `docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md`
- **SDK usage** → `packages/mfe-sdk/README.md`
- **What changed recently** → `plans/260913-2241-cross-remote-state/plan.md` · `docs/code-standards-frontend.md`
- **Auth/scope semantics** → This file + backend code (`backend/src/api/auth/`, `backend/src/guards/`, `backend/src/decorators/`)
- **Documentation governance** → This file (CLAUDE.md)

---

**Last updated:** 2026-09-15  
**Phase B:** ✓ Complete  
**Phase C:** ✓ Executed  
**FE libs modernize:** ✓ Complete  
**Admin Remote UI:** ✓ Complete  
**Remote standalone + multi-surface:** ✓ Spec A/B (`plans/260915-1117-remote-standalone-multi-surface/`)
