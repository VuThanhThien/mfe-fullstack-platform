# Project Overview & PDR (Product Development Requirements)

**Date:** 2026-09-13  
**Version:** 1.2  
**Status:** Active (Phase B ✓ | Phase C ✓ | FE libs modernize ✓ | Admin Remote UI ✓)

---

## Executive Summary

The Micro-Frontend Fullstack Platform is a **production-grade micro-frontend system** that enables multiple independent frontend applications to integrate into a single, seamless user experience under one domain. Phase B delivered a secure backend with authentication, scope-based authorization, and a configuration registry. Phase C delivered the frontend platform (landing, shell, demo remote) with same-origin routing via Caddy, cookie-based session management, and the shared @mfe/sdk.

**Runs end-to-end locally.** `make up` starts Postgres, Redis, the backend, landing, shell, the demo remote and the Caddy gateway; the browser talks only to `http://localhost:8080`. **Production deployment is unverified** — the repo contains no CI, no production Caddyfile and no deploy artifacts, so any "deployed / production-ready" claim is not supported here. Phase D covers production hardening and multi-framework support.

---

## 1. Problem Statement

### Current State (Pre-Phase B)
- No centralized authentication for MFE apps
- No standard authorization model across remotes
- No registry to discover and gate remote applications

### Business Goals
1. **Single entry point** — Users log in once; all remotes share the session
2. **Scope-based entitlement** — Granular access control without a roles/permissions table
3. **Runtime-configurable** — Remotes registered via database, not hardcoded
4. **Developer friction-free** — SDK handles auth/API/federation; remotes don't re-invent
5. **Production-ready security** — HttpOnly cookies, no tokens in URLs, instant logout

---

## 2. Functional Requirements

### 2.1 Authentication & Session

| # | Requirement | Priority | Status |
|---|-------------|----------|--------|
| F1.1 | Email/password login with secure password hashing | P0 | ✓ Phase B |
| F1.2 | Access token (JWT, 15-minute TTL, memory-only in frontend) | P0 | ✓ Phase B |
| F1.3 | Refresh token in HttpOnly cookie (rotated on refresh) | P0 | ✓ Phase C |
| F1.4 | Session blacklist (Redis) for instant logout | P0 | ✓ Phase B |
| F1.5 | Public registration endpoint (email/password) | P0 | ✓ Phase B |
| F1.6 | Email verification stubs (no frontend UI this phase) | P1 | ✓ Phase B (job only) |

### 2.2 Authorization & Scopes

| # | Requirement | Priority | Status |
|---|-------------|----------|--------|
| F2.1 | Scope entity (unique names, no implicit creation) | P0 | ✓ Phase B |
| F2.2 | User-scope assignment (many-to-many join table) | P0 | ✓ Phase B |
| F2.3 | ADMIN scope (no special bypass; ADMIN must have intersection with configs) | P0 | ✓ Phase B |
| F2.4 | Scope-based guards on API endpoints (@RequireScopes) | P0 | ✓ Phase B |
| F2.5 | Scope staleness model (15-min token lag; instant logout) | P0 | ✓ Phase B |
| F2.6 | No roles or permissions table | P0 | ✓ Phase B (architecture) |

### 2.3 MFE Configuration & Registry

| # | Requirement | Priority | Status |
|---|-------------|----------|--------|
| F3.1 | MfeConfig entity (remoteEntry, remoteName, exposedModule) | P0 | ✓ Phase B |
| F3.2 | Scope-based visibility (ANY-overlap; ADMIN ≠ bypass) | P0 | ✓ Phase B |
| F3.3 | `GET /api/v1/mfe-configs/accessible` endpoint | P0 | ✓ Phase B |
| F3.4 | Route metadata (routeName, title, framework) on MfeConfig | P0 | ✓ Phase C |
| F3.5 | CRUD endpoints for ADMIN (POST, PATCH, DELETE) | P0 | ✓ Phase B |
| F3.6 | Seed with one stub demo config (Phase C) | P1 | ✓ Phase C |

### 2.4 Frontend Platform (Phase C ✓ Complete)

| # | Requirement | Priority | Status |
|---|-------------|----------|--------|
| F4.1 | Landing page (public, register/login, MUI) | P0 | ✓ Phase C |
| F4.2 | Shell app (authenticated, nav from `accessible`, remote outlet) | P0 | ✓ Phase C |
| F4.3 | @mfe/sdk (auth + api + loadRemote + shared singleton) | P0 | ✓ Phase C |
| F4.4 | Demo React remote (mount/unmount + one api call) | P0 | ✓ Phase C |
| F4.5 | Caddy gateway (`:8080` same-origin proxy) | P0 | ✓ Phase C |
| F4.6 | Module Federation runtime remotes (no hardcoding) | P0 | ✓ Phase C |

### 2.5 Security

| # | Requirement | Priority | Status |
|---|-------------|----------|--------|
| F5.1 | No tokens in localStorage / URL / logs | P0 | ✓ Phase C |
| F5.2 | HttpOnly, SameSite=Lax, Secure (prod) cookie flags | P0 | ✓ Phase C |
| F5.3 | CORS allow-list via APP_CORS_ORIGIN | P0 | ✓ Phase B |
| F5.4 | Migration-only schema changes (DATABASE_SYNCHRONIZE=false) | P0 | ✓ Phase B |
| F5.5 | Redacted token logging (extend loggingRedactPaths) | P1 | ✓ Phase C |

**Current frontend contract (FE libs modernize, shipped):**

- **Pins:** React 18.3, Vite 5.x, MUI 6, react-router-dom 6, `@module-federation/vite@1.16.6` (pinned), `react-hook-form@^7.88` + `zod@^4.6` + `@hookform/resolvers@^5.9`, `usehooks-ts@^3.1`.
- **HTTP boundary:** axios `^1.20` is a runtime dependency of `packages/mfe-sdk` **only**; apps must never `import axios` (nor use raw `fetch` for `/api/v1/*`). `api.*` resolve an `AxiosResponse<T>` (read `res.data`) and reject `ApiError { status, body, message }` (`status === 0` = transport failure). `react-hook-form` is an MF `shared` singleton; axios deliberately is not.
- **Local topology:** `make up` runs db, redis, backend, landing, shell, demo-react and the Caddy gateway; browser origin `http://localhost:8080`, backend direct on `:3000`, Postgres host port `25432` (published only by `docker-compose.infra.yml` via `make infra`; the base compose publishes no DB port), database `mfe_backend`. Package managers differ: landing uses **npm**; shell, demo-react and mfe-sdk use **pnpm**.
- **Admin Remote UI (Phase D5):** ✓ SHIPPED 2026-09-13. Federation remote `remotes/admin-react` at gateway `/r/admin-react/`, seeded as `routeName=admin` on scopes `[ADMIN]`.
- Details: [`docs/codebase-summary.md`](codebase-summary.md), [`docs/local-development-guide.md`](local-development-guide.md), [`gateway/README.md`](../gateway/README.md).

---

## 3. Non-Functional Requirements

| # | Requirement | Target | Priority | Status |
|---|-------------|--------|----------|--------|
| N1 | Auth endpoint latency | <100ms | P1 | ✓ Phase B |
| N2 | `accessible` endpoint response time | <200ms (scales with scope count) | P1 | ✓ Phase B |
| N3 | DB query count per request | ≤2 (no N+1) | P0 | ✓ Phase B |
| N4 | Redis session lookup | <10ms | P1 | ✓ Phase B |
| N5 | No downtime during rolling deploy | Architecture | P1 | Design target — **not exercised**: the repo has no CI/CD or deploy pipeline |
| N6 | MfeConfig changes visible within 15 minutes | By design (token TTL) | P0 | ✓ Phase B |

---

## 4. Data Model

### Core Entities

```sql
-- Users
user (id, email, password_hash, deleted_at)

-- Scopes (privilege levels)
scope (id, name)

-- User grants
user_scope (user_id, scope_id)

-- Micro-frontend configs
mfe_config (id, remote_entry, remote_name, exposed_module, route_name, title, framework)

-- Config visibility
mfe_config_scope (mfe_config_id, scope_id)

-- Session blacklist
session (token_hash, expires_at)
```

### Key Constraints

- `scope.name` is unique, uppercase, matches `^[A-Z0-9_:.-]{2,50}$`
- `mfe_config.route_name` is unique, lowercase, matches `^[a-z0-9-]{2,40}$`
- `mfe_config.route_name` is unique; (`remote_name`, `exposed_module`) is unique. Shared `remote_entry` / `remote_name` is allowed for multi-expose bundles.
- Cascade delete: user → user_scope; mfe_config → mfe_config_scope
- Restrict delete: scope (if assigned to user or config) → 409

---

## 5. API Surface

### Auth Endpoints

| Method | Path | Auth | Input | Output | Status |
|--------|------|------|-------|--------|--------|
| POST | `/api/v1/auth/email/register` | None | `{ email, password }` | `{ userId }` | ✓ B |
| POST | `/api/v1/auth/email/login` | None | `{ email, password }` | `{ userId, accessToken, tokenExpires }` + `Set-Cookie: refresh_token` | ✓ B → **C delta** |
| POST | `/api/v1/auth/refresh` | Cookie | `{}` | `{ userId, accessToken, tokenExpires }` + `Set-Cookie: refresh_token` | ✓ C |
| POST | `/api/v1/auth/logout` | Bearer | none | none | ✓ B |

### Scope Endpoints (ADMIN Only)

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/scopes` | ✓ B |
| GET | `/api/v1/scopes` | ✓ B |
| PATCH | `/api/v1/scopes/:id` | ✓ B |
| DELETE | `/api/v1/scopes/:id` | ✓ B |

### User Endpoints (ADMIN Only)

| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/users` | ✓ B |
| GET | `/api/v1/users` | ✓ B |
| PATCH | `/api/v1/users/:id` | ✓ B |
| DELETE | `/api/v1/users/:id` (soft delete + scope revoke) | ✓ B |

### MFE Config Endpoints

| Method | Path | Auth | Notes | Status |
|--------|------|------|-------|--------|
| GET | `/api/v1/mfe-configs/accessible` | Bearer | ANY-scope intersection | ✓ B |
| GET | `/api/v1/mfe-configs` | ADMIN | Full registry | ✓ B |
| GET | `/api/v1/mfe-configs/:id` | Bearer or ADMIN | Includes `scopes` if ADMIN | ✓ B |
| POST | `/api/v1/mfe-configs` | ADMIN | Requires `routeName`, `title`, `framework` (Phase C) | ✓ C |
| PATCH | `/api/v1/mfe-configs/:id` | ADMIN | Omitted fields unchanged | ✓ B |
| DELETE | `/api/v1/mfe-configs/:id` | ADMIN | — | ✓ B |

### Other Endpoints

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/health` | None | ✓ B |
| GET | `/api/docs` | None (dev only) | ✓ B |

---

## 6. Success Criteria & Validation

### Phase B (Complete ✓)

- [x] Backend runs on `:3000`
- [x] Postgres + Redis healthy
- [x] Seed: `admin@example.com` / `12345678` owns ADMIN
- [x] Login returns access JWT (15m TTL)
- [x] `accessible` returns configs with scope intersection
- [x] ADMIN does **not** bypass intersection check
- [x] Logout blacklists session (Redis)
- [x] 236 unit test blocks green across 23 `*.spec.ts` files (static count, mocked)
- [x] 40 e2e blocks green across 5 `backend/test/*.e2e-spec.ts` suites (static count, real DB)
- [x] Swagger UI functional

### Phase C (Complete ✓)

**Verified evidence:** browser smoke through the gateway `:8080` passed 9/9 (login, zod field error on empty submit, lands on `/app`, no tokens in `localStorage`/`sessionStorage`, session survives a hard refresh, demo remote mounts, `GET /api/v1/users/me` 200, no MF RUNTIME-008); `make smoke` returns 200 on **4 gateway route checks plus a direct `curl http://localhost:3000/health`**; SDK **44 vitest tests across 4 spec files**; backend 236 unit + 40 e2e (static counts, not re-run while editing docs); landing/shell/demo `typecheck` + `build` green. Form/HTTP stack: [`docs/code-standards-frontend.md`](code-standards-frontend.md) (former `260913-2118-fe-libs-modernize` plan consolidated away).

**Frontend:**
- [x] Browser happy path uses only `:8080` (no `:5173`, `:3000`) — browser smoke through Caddy
- [x] Login succeeds; access token in memory; refresh in HttpOnly cookie — browser smoke + backend `Set-Cookie`
- [x] JSON response has no `refreshToken` field — backend e2e; see API surface above
- [x] Hard refresh `/app` stays authenticated — browser smoke (cookie refresh on boot)
- [x] Dashboard user sees Demo React in nav; scope-less user sees empty nav — seed `demo` config scoped `[DASHBOARD]`, ANY-overlap `accessible`
- [x] Demo remote mounts and makes an authenticated API call — `GET /api/v1/users/me` 200 via the SDK
- [x] Logout clears cookie; refresh then 401 — Redis blacklist + cookie clear in backend
- [x] `?next=https://evil.test` ignored → `/app` — same-origin `next` sanitizer (`packages/mfe-sdk/src/next.ts`)

**Backend:**
- [x] `POST /api/v1/auth/login` and `/api/v1/auth/refresh` set `refresh_token` cookie — backend code; `Set-Cookie` documented above
- [x] E2E tests updated: no compatibility-mode body `refreshToken` — 40 e2e blocks across 5 suites
- [x] MfeConfig seed includes `routeName`, `title`, `framework` — `1722335727000-mfe-config-seeder.ts` seeds `demo` → `/app/demo`
- [x] Dashboard user (non-admin, owns `DASHBOARD` scope) sees the stub — `dashboard@example.com` seeded with `DASHBOARD`

**Integration:**
- [x] Backend `pnpm test` (236) + `pnpm test:e2e` (40) and SDK `pnpm test` (44) reported green — **note:** landing/shell/demo-react have **no `test` script**; their gate is `typecheck` + `build`
- [x] No tokens in logs — redacted logging paths; Caddy access logs carry no bodies/tokens
- [x] SDK consumed from `packages/mfe-sdk/` by all three Vite apps via `file:` deps — each app's `package.json`

---

## 7. Out of Scope

🚫 **Explicitly not included (may be future phases):**

- Admin UI dashboard (manage scopes/users via API only)
- Vue remotes (Phase C = React only)
- Angular remotes
- Widget view / event bus
- Pages / per-route ACL
- Full RBAC with permissions table
- MinIO artifact uploads
- RS256 on remoteEntry
- npm publish of `@mfe/sdk` (Phase C = `file:` deps)
- Umbrella as git repo
- Gateway as git repo
- Email verification UI
- Password reset UI
- Viblo-style localStorage tokens or `?token=` URLs

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Memory access lost on landing → shell nav | User can't interact with remotes | Shell **must** refresh on boot; document prominently |
| MF singleton version skew (React dupe) | App crashes or bundle size bloat | All three Vite apps pin same `react` major; use `file:` shared config |
| Cookie not sent to remotes | 401 on every remote API call | SDK sets `withCredentials: true` on every request; verify cookie domain = `:8080` only |
| Refresh token never rotated | Session hijack risk over time | Phase C: rotate on every refresh; Phase B can stay static |
| MfeConfig seed URL wrong | Remote won't load | Seed uses `PUBLIC_GATEWAY_URL` env; default `http://localhost:8080` |
| Existing e2e break on cookie change | Regression | Rewrite e2e in same PR as cookie change; no dual body+cookie API |

---

## 9. Timeline & Effort

### Phase B: Backend (Completed ✓)

- **Start:** 2026-09-12
- **End:** 2026-09-13
- **Duration:** ~24 hours (iterative)
- **Delivery:** Running backend, seed, e2e suite

### Phase C: Frontend (Delivered ✓, 2026-09-13)

Dates below are the plan's original estimates; the phase shipped on **2026-09-13** (~25h planned, delivered).

| Phase | Task | Effort | Planned start | Planned end | Status |
|-------|------|--------|---------------|-------------|--------|
| P1 | Backend cookie + MfeConfig metadata | 6h | 2026-09-13 | 2026-09-14 | ✓ Done |
| P2 | @mfe/sdk | 4h | 2026-09-13 | 2026-09-13 | ✓ Done |
| P3 | Caddy gateway | 1.5h | 2026-09-13 | 2026-09-13 | ✓ Done |
| P4 | Landing | 3h | 2026-09-14 | 2026-09-14 | ✓ Done |
| P5 | Shell | 5h | 2026-09-14 | 2026-09-15 | ✓ Done |
| P6 | Demo React remote | 3h | 2026-09-14 | 2026-09-14 | ✓ Done |
| P7 | Smoke + git hygiene | 2h | 2026-09-15 | 2026-09-15 | ✓ Done |
| **Total** | — | **~25h** | — | 2026-09-13 | ✓ Done |

### FE libs modernize (Delivered ✓, 2026-09-13)

~10h plan, executed. axios replaced `fetch` **inside `packages/mfe-sdk` only** (a `http` instance with Bearer injection plus one deduped 401 refresh-and-retry, and a bare `authHttp` for login/register/refresh/logout); `api.*` resolve `AxiosResponse<T>` and reject `ApiError { status, body, message }`; landing Login/Register use react-hook-form + `zodResolver` + MUI `Controller`; shell/demo adopt `usehooks-ts`; `react-hook-form` is an MF `shared` singleton (axios deliberately is not). Also fixed in passing: `typecheck` → `tsc -b --noEmit`, `@types/node` added, all three Dockerfiles now install the SDK's own deps, landing image hygiene. Documented in [`docs/code-standards-frontend.md`](code-standards-frontend.md) (former plan folder consolidated away).

### Admin Remote UI (Delivered ✓, Phase D5, 2026-09-13)

**10h plan, executed.** Federation remote `remotes/admin-react` exposes user & scope CRUD forms via react-hook-form + zod + MUI. Uses a "SoftGate" pattern (reads scopes from the shared SDK token for early 401 guard); routes: POST/GET/PATCH/DELETE `/api/v1/users` and `/api/v1/scopes`. Seeded as `routeName=admin` on scopes `[ADMIN]`; appears in shell nav only to ADMIN users. Plan: [`plans/260913-2113-admin-remote-ui/plan.md`](../plans/260913-2113-admin-remote-ui/plan.md) (status: completed).

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **MFE** | Micro-frontend — independent frontend app loaded at runtime |
| **Shell** | Host application that loads and mounts remotes |
| **Remote** | Federated app exposed via Module Federation |
| **Scope** | Named privilege (e.g., `ADMIN`, `DASHBOARD`); user has zero or more |
| **Accessible** | MFE configs a user can see (ANY-scope intersection) |
| **Access token** | Short-lived JWT (15m); in memory; sent in Authorization header |
| **Refresh token** | Long-lived token; in HttpOnly cookie; rotated on refresh |
| **Session blacklist** | Redis set of revoked token hashes; checked on every auth request |
| **RemoteEntry** | JavaScript file exposing federation container (`remoteEntry.js`) |
| **Gateway** | Caddy reverse proxy unifying backend + frontend apps under one origin |

---

## 11. Contact & Questions

- **Backend questions:** See `backend/README.md` and [Phase B implementation notes](brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md)
- **Phase C design:** [Phase C approved spec](brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md); what actually shipped for form/HTTP: [`docs/code-standards-frontend.md`](code-standards-frontend.md)
- **Current state:** [`docs/codebase-summary.md`](codebase-summary.md), [`docs/local-development-guide.md`](local-development-guide.md), [`gateway/README.md`](../gateway/README.md)
- **All phases complete** — Roadmap: `docs/project-roadmap.md`; Admin Remote UI shipped 2026-09-13
- **Authority on conflicts:** See CLAUDE.md (implementation > notes > executed plans > spec)

---

**Document version:** 1.2  
**Last updated:** 2026-09-13
