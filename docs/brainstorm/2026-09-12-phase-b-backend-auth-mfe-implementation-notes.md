# Implementation Notes — Phase B: Backend Auth + Scope + MFE Config

**Date:** 2026-09-12
**Status:** implemented — this file records where the shipped backend diverges from the spec
**Spec (pre-implementation):** [`2026-09-12-phase-b-backend-auth-mfe-spec.md`](./2026-09-12-phase-b-backend-auth-mfe-spec.md)
**Plan:** `plans/260912-2307-phase-b-backend-auth/`
**Authoritative sources:** `backend/README.md` and `backend/` code

---

## Why this addendum exists

The spec was written **before** implementation and got several concrete details wrong. The
implementation corrected them. Read these notes alongside the spec; where the two disagree,
**the implementation notes and the `backend/` code win.** The original spec is left intact
for historical context.

## 1. Routes and API docs

| Spec said | Actual |
|-----------|--------|
| `/v1/mfe-configs/accessible` (and other `/v1/...` paths) | **`/api/v1/...`** — `API_PREFIX=api` plus URI versioning |
| Auth paths "per existing" (uncertain) | `POST /api/v1/auth/email/login`, `POST /api/v1/auth/email/register`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` |
| (Not specified) | Swagger UI at **`/api/docs`** — **development only**. Health at `/health`, excluded from the `/api` prefix. |

## 2. Authorization is scope-only

- The access JWT carries `scopes: string[]`. TTL is **15m** (`AUTH_JWT_TOKEN_EXPIRES_IN=15m`),
  i.e. `exp - iat == 900`.
- The boilerplate `role` claim is **gone**. There is **no roles or permissions table**.
- **Admin == owns the `ADMIN` scope.** Guarded with `@RequireScopes(ADMIN_SCOPE)`; missing
  scope → 403.
- `POST /api/v1/auth/email/register` stays public; `POST /api/v1/users` is ADMIN-only.

## 3. Freshness and revocation (the key operational caveat)

- Privileges are re-read **from the database only on `POST /api/v1/auth/refresh`**. All other
  scope checks read the access token, so grants and revocations lag by **up to 15 minutes**.
- **`POST /api/v1/auth/logout` is the only instant revocation** — it blacklists the session in
  Redis immediately. A blacklisted/absent token → 401.

## 4. `accessible` semantics

- `GET /api/v1/mfe-configs/accessible` reads the caller's scopes **from the database** (not the
  token) and returns configs sharing **at least one** scope (**ANY-overlap**).
- **`ADMIN` deliberately does NOT bypass** the intersection. The full registry is
  `GET /api/v1/mfe-configs`, which is **ADMIN only**.
- The `accessible` response **omits the `scopes` field**; the ADMIN list includes it.
- A user with no scopes gets `[]`.
- `@Get('accessible')` is declared before `@Get(':id')` so it is never parsed as a UUID param.

## 5. Error mapping (actual)

| Case | Status | Notes |
|------|--------|-------|
| Missing / invalid / blacklisted token | **401** | |
| Authenticated but missing required scope | **403** | |
| Unknown entity id | **404** | |
| Duplicate `scope.name` or `mfe_config.remote_entry` | **409** | DB unique-index violations (constraint names prefixed `UQ_`) |
| Delete a scope still assigned to a non-deleted user or to an MFE config | **409** | `errorCode: E005`. A lost race is also mapped to 409 rather than 500 |
| Unknown scope name on assign | **400** | message lists the unknown names (`E006`) |
| Validation failure, incl. empty `scopeNames: []` | **422** | ValidationPipe default |

**Spec correction:** the spec said empty `scopeNames` → 400. The implementation uses the
ValidationPipe's **422**.

## 6. Scope naming and lifecycle

- Names are **uppercased** and validated against `^[A-Z0-9_:.-]{2,50}$`. `scopeNames` passed
  to the user and MFE-config endpoints are uppercased too, so `['dashboard']` resolves to
  `DASHBOARD` instead of failing with 400.
- Scopes are **never created implicitly** by assigning them (a typo cannot invent a privilege).
- **Renaming the `ADMIN` scope is rejected with 409.**

## 7. PATCH semantics

- `scopeNames` **present** → replaces the whole set.
- `scopeNames` **absent** → leaves the set unchanged.
- Therefore `PATCH /mfe-configs/:id` **cannot wipe scopes by omission**.
- `PATCH /users/:id` touches only the fields actually present in the payload (a previous
  `save()`-based implementation overwrote omitted `bio`/`image` with `undefined` **and**
  re-ran the password hash over the stored hash, permanently breaking that user's login;
  scalar updates now bypass the entity hooks).

## 8. Data model

- Domain tables: `scope`, `mfe_config`, and two join tables `user_scope` / `mfe_config_scope`.
- **Users have soft delete; scopes and MFE configs do not.**
- Deleting a user cascades its grants; a scope in use is **RESTRICTed** (surfaced as the
  pre-checked 409 above rather than a 500).
- `DELETE /api/v1/users/:id` is a **soft delete**, but it also revokes the user's scope
  grants and blacklists its sessions, so a deleted user loses access immediately rather
  than retaining it until the access token expires (≤ 15m).

## 9. Seeding

- `pnpm seed:run` creates scopes **`ADMIN`** and **`DASHBOARD`**, the user
  **`admin@example.com` / `12345678`** owning `ADMIN`, and **5 scope-less demo users**.
- It is **idempotent** — repeated runs add nothing and do not corrupt the admin password.
- **Seed credentials are development-only.** Production bootstrap must supply its own password.

## 10. Testing

- `pnpm test` — unit tests, mocked, no database (235 tests).
- `pnpm test:e2e` — real Postgres + Redis against a dedicated `mfe_backend_test` database
  configured via `.env.test`; runs serially and **truncates the domain tables** (36 tests).
  The harness refuses to run against a database whose name does not contain "test".
- E2E boots the app through the **same `configureApp()` pipeline as production**, so global
  prefix, versioning, guards and exception filters are genuinely exercised (the original
  boilerplate e2e harness did none of this). The authorization matrix was mutation-tested:
  removing a `@RequireScopes` decorator makes it fail.
- The suite truncates one shared database, so **two e2e runs must not execute concurrently**.

## 11. Out of scope for this phase (unchanged)

MinIO / artifact upload · `MFEDeployment` versioning · FE shell / remotes · page and route ACL ·
full RBAC · RS256.
