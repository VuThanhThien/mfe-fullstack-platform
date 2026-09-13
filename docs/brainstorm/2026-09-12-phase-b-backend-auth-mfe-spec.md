# Design Spec — Phase B: Backend Auth + Scope + MFE Config

**Date:** 2026-09-12  
**Status:** approved — plan at `plans/260912-2307-phase-b-backend-auth/`  
**Approach:** Surgical port (Approach 1)  
**Workspace folder:** `micro-frontend-fullstack-2026/` (not a git monorepo)  
**Repo (phase B):** `micro-frontend-fullstack-2026/backend/` (standalone NestJS git repo)

> **Implementation update:** this spec predates the build and several facts below were corrected during implementation.
> See [`2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`](./2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md) — where they differ, the implementation notes and `backend/` code win.

---

## 1. Problem statement

Cần backend production-shaped cho nền MFE: auth, phân quyền admin, registry MFE (`accessibleConfigs`), scope. Demo viblo (`viblo-mfe-auth/auth-service`) đủ concept nhưng Express/Prisma/MySQL, thiếu session/refresh. Nest boilerplate (`nestjs-boilerplate-vndevteam`) đủ infra auth/session/Redis/Postgres nhưng không có Scope/MFE/RBAC.

Phase B = copy boilerplate vào repo `backend/`, port domain logic viblo, không làm FE/MinIO/Pages.

### User stories

- As admin, I CRUD users and assign scopes.
- As admin, I CRUD scopes (incl. bootstrap `ADMIN`).
- As admin, I CRUD MFE configs and bind scopes.
- As authenticated user, I list only MFE configs whose scopes intersect mine (`accessible`).
- As any client, I login/refresh/logout with Nest session model; access token carries `scopes[]` (TTL ≤15m); refresh reloads scopes from DB.

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| MVP scope | BE only: Auth + Users + Scopes + MFEConfig + accessible |
| Auth tokens | Nest-native: access+refresh, session, Redis blacklist, HS256; extend access payload with `scopes[]` |
| Authorization | Scope-only; admin = scope `ADMIN`; no `isAdmin` boolean |
| Repo topology | Polyrepo: folder tổng chứa nhiều git repo; phase B = `backend/` |
| Parent folder | Not git root; avoid nested-repo pain |
| Scope change | Lazy: no session revoke; access ≤15m; refresh embeds fresh scopes from DB |
| MFEConfig shape | Viblo parity only (`remoteEntry`, `remoteName`, `exposedModule` + scopes) |
| Approach | Surgical port — keep boilerplate paths/patterns; add modules; drop Post demo |

---

## 3. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | Surgical port | **Selected** — fastest, matches viblo domain, reuses Nest auth |
| 2 | Domain rewrite (Nest-idiomatic API polish) | Rejected — extra polish delay, FE mapping churn |
| 3 | Authz-ready skeleton (empty Role/MFEDeployment) | Rejected — YAGNI |

Monorepo (`apps/api` + pnpm/turbo) considered then **rejected**: multi-team needs separate GitHub + deploy ownership → polyrepo.

---

## 4. Architecture

### 4.1 Folder / repos

```
micro-frontend-fullstack-2026/     # local umbrella folder (no root git)
├── backend/                       # git repo — NestJS (THIS PHASE)
├── shell/                         # future — React host
├── manager/                       # future — admin UI
├── remotes/…                      # future — per-remote repos
├── platform-docs/                 # optional meta git: ADR, OpenAPI snapshots
└── docs/brainstorm/               # design specs (this file); move to platform-docs later if desired
```

### 4.2 Backend modules

| Module | Action |
|--------|--------|
| Auth | Reuse; access TTL ≤15m; put `scopes` on access JWT; refresh loads scopes from DB |
| User | Extend M2M scopes; assign `scopeNames` on create/update; gate admin CRUD with `ADMIN` |
| Scope | **New** CRUD |
| MfeConfig | **New** CRUD + `GET accessible` |
| Post | Remove / unregister |
| ScopesGuard + `@RequireScopes(...)` | **New** |

### 4.3 Data model (TypeORM + Postgres)

- **Scope:** `id`, `name` (unique), `description`
- **User ↔ Scope:** M2M (no `isAdmin` column)
- **MfeConfig:** `remoteEntry`, `remoteName`, `exposedModule` + M2M Scope
- **Accessible rule:** config included if **any** scope overlaps user scopes (viblo `some`)

---

## 5. Data flow & interfaces

### Auth

```
Login  → access (id, sessionId, scopes[]) TTL≤15m + refresh
Refresh → validate session → SELECT user scopes → new access
Logout → blacklist session
```

Scope assignment change: sessions stay; privilege window ≤ access TTL.

### Accessible

```
GET /v1/mfe-configs/accessible
→ Auth required
→ Load user scopes from DB (do not trust JWT alone for this list)
→ Return configs with intersecting scopes
```

### API surface

Keep existing boilerplate auth route paths (do not invent parallel `/auth/login` if boilerplate already has email login). New domain under Nest `v1`:

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| POST | auth login/refresh/logout (boilerplate paths) | per existing | — |
| CRUD | `/v1/users` (+ `scopeNames`) | yes | `ADMIN` |
| CRUD | `/v1/scopes` | yes | `ADMIN` |
| GET | `/v1/mfe-configs` | yes | `ADMIN` |
| GET | `/v1/mfe-configs/accessible` | yes | any |
| POST/GET/PATCH/DELETE | `/v1/mfe-configs`, `/:id` | yes | `ADMIN` |

**Write DTO MfeConfig:** `{ remoteEntry, remoteName, exposedModule, scopeNames: string[] }`  
**Admin list:** include scopes. **Accessible:** scopes optional/omitted.  
**Seed:** scope `ADMIN` + admin user linked to `ADMIN`.  
**Cross-repo contract:** Swagger/OpenAPI from Nest; npm `@org/api-types` = later TODO.

**Hardening vs viblo:** POST create MFE requires `ADMIN` (viblo left it open).

---

## 6. Error handling

Reuse boilerplate exception filter / error DTO.

| Case | Status |
|------|--------|
| Missing/invalid/blacklisted token | 401 |
| Missing `ADMIN` | 403 |
| Unknown scope name on assign | 400 (no implicit create) |
| Duplicate scope `name` | 409 |
| Delete scope still linked to User or MfeConfig | 409 restrict |
| Missing entity id | 404 |
| Bad login | 401 generic |
| MFE create with empty `scopeNames` | 400 (≥1 scope required) |

No soft-delete for Scope/MfeConfig in B (User soft-delete only if boilerplate already has it).

---

## 7. Testing strategy

- Unit: `ScopesGuard`; pure intersect helper if extracted
- E2E (priority): login scopes in token; non-admin 403 on admin routes; admin CRUD; accessible intersection; refresh picks new scopes; delete linked scope → 409; empty scopeNames → 400; create MFE without ADMIN → 403
- CI: inside `backend` repo only (lint + unit + e2e w/ Postgres)
- Out: FE, MinIO, load tests, full boilerplate regression beyond touched auth smoke

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Boilerplate auth paths/DTO differ from this doc | Map to real paths during `/plan` scout; do not fork second auth API |
| JWT scopes stale ≤15m | Document; refresh always DB; harden later (invalidate sessions / scopesVersion) |
| Copying boilerplate `.env` / secrets | Use `.env.example` only; never commit secrets |
| Umbrella folder accidentally git-inited with nested repos | Keep parent non-git; each child `git init` + own remote |
| Over-scoping into Pages/MinIO/FE | Explicit out-of-scope below |

**Effort estimate:** ~2–4 days for experienced Nest + viblo familiarity.

---

## 9. Out of scope (phase B) + TODOs

### Out of scope now

- React/MUI shell, manager UI, remotes
- Pages + route ACL
- MinIO + deployment versioning
- Full RBAC (Role → Permission)
- RS256 / remote `remoteEntry` public-key gate
- Publishing npm API types package
- pnpm/Turborepo monorepo root

### TODO — later phases (do not stub schema now)

1. **Full RBAC (former option C):** Role → Permission; migrate off raw scope-as-admin if needed; keep Scope for MFE entitlement or map Permission→Scope
2. **`MFEDeployment` entity (separate from MfeConfig):** version, artifact key, bucket/MinIO pointer, activate/rollback; **do not** add nullable MinIO columns onto `MfeConfig` in B
3. **Pages / route permission:** depends on RBAC or extended scope model
4. **FE repos** under umbrella: `shell`, `manager`, remotes — consume OpenAPI
5. **Optional `platform-docs` repo:** clone-all scripts, ADR, OpenAPI snapshots for multi-team
6. **Session invalidate on scope change** or `scopesVersion` claim — if 15m window unacceptable
7. **npm `@org/api-types`** from OpenAPI for polyrepo FE teams

---

## 10. Success metrics / validation

- [ ] `backend/` is independent git repo; umbrella folder has no requirement to be git root
- [ ] `docker compose` up → API + Postgres + Redis healthy
- [ ] Seed admin can CRUD scopes, users (w/ scopes), mfe-configs
- [ ] Non-admin authenticated user: 403 on admin routes; `accessible` returns only intersecting configs
- [ ] After admin grants new scope, **refresh** yields access JWT containing new scope; old access may lag ≤15m
- [ ] Delete scope in use → 409
- [ ] Swagger lists new endpoints
- [ ] E2E cases in §7 pass
- [ ] No MinIO/Pages/Role tables in migrations for B

---

## 11. Next steps

1. User approves this spec (or requests edits)
2. Run `/plan` with this spec path → implementation plan for `backend/` only
3. Execute plan: copy boilerplate → migrate domain → guards → e2e

**Dependencies:** local copy of `nestjs-boilerplate-vndevteam`; reference `viblo-mfe-auth/auth-service` for domain behavior only (not stack).

---

## 12. Sources

- `viblo-mfe-auth/auth-service` — Scope, MFEConfig, accessible intersection, admin middleware patterns
- `nestjs-boilerplate-vndevteam` — Nest shell, JWT session/refresh, Redis, TypeORM, Docker, Swagger
