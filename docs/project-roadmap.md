# Project Roadmap & Timeline

**Date:** 2026-09-13  
**Version:** 1.4  
**Last Updated:** 2026-09-16

---

## Overview

The Micro-Frontend Fullstack Platform is delivered in phases:

- **Phase A (Pre-Phase B):** Not yet documented; assumed to be setup/planning
- **Phase B (Complete ✓):** Backend auth, scopes, MFE registry
- **Phase C (Complete ✓):** Frontend platform (landing, shell, React demo remote), same-origin gateway, `@mfe/sdk`
- **FE libs modernize (Complete ✓):** axios confined to `@mfe/sdk`, react-hook-form + zod forms, `usehooks-ts`
- **Phase D5 — Admin Remote UI (Complete ✓):** `remotes/admin-react`, port 5176, seed `routeName=admin` on `[ADMIN]`
- **App Launcher + Nested Nav Tree (Complete ✓):** `/app` Home + header Apps + shell-owned nested drawer from API; ADMIN CRUD. Plan [`plans/260916-1737-app-launcher-nav-tree/`](../plans/260916-1737-app-launcher-nav-tree/plan.md). Spec [`docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`](./brainstorm/2026-09-16-app-launcher-nav-tree-spec.md)
- **Phase D+ (Future):** Angular remotes, advanced features

This roadmap records Phases B–C, FE libs modernize, Admin Remote UI (D5), Vue D1–D2, and the app launcher / nested nav tree as delivered; Angular remotes remain future work.

---

## Phase B: Backend (2026-09-12 → 2026-09-13) ✓

**Status:** Complete  
**Delivery:** NestJS 10 service with auth, scopes, and MFE config registry

### Completed Deliverables

- ✓ NestJS 10 + Express + Postgres 16 + Redis
- ✓ Email/password auth with JWT (15m access) + session blacklist
- ✓ Scope-only authorization (no roles/permissions table)
- ✓ MFE config registry with scope-gated `accessible` endpoint
- ✓ CRUD APIs for users, scopes, and configs (ADMIN-gated)
- ✓ Seed data: `admin@example.com` / `12345678` owning ADMIN
- ✓ Swagger UI at `/api/docs` (dev only)
- ✓ 236 unit test blocks across 23 `*.spec.ts` files (mocked) + 40 e2e blocks across 5 `backend/test/*.e2e-spec.ts` suites (real DB)
- ✓ Health endpoint `/health`



### Key Features Locked

- Access token: memory-only in FE (Phase C)
- Refresh token: HttpOnly cookie (Phase C delta)
- Scope staleness: 15-minute lag (by design)
- ADMIN bypass: None (ADMIN must have scope intersection)
- `accessible` endpoint: Re-reads DB to prevent staleness

---



## Phase C: Frontend Platform (Complete ✓) — ~25 hours (~3–4 days)

**Spec:** `docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md`  
**Plan:** executed from per-phase plans that were later **consolidated away** — `plans/260913-1735-phase-c-mfe-platform/` and `plans/260913-2118-fe-libs-modernize/` no longer exist on disk. Current plans under `plans/` include `260913-2113-admin-remote-ui/` (completed) and `260913-2241-cross-remote-state/`. Form/HTTP stack: [`docs/code-standards-frontend.md`](code-standards-frontend.md).  
**Effort:** 25 hours planned; delivered 2026-09-13.

### Execution Strategy: Wave-Based Parallelism

**Wave 0 (Parallel, no dependencies):** P1, P2, P3


| Phase | Task                                | Hours | Prereqs | Status |
| ----- | ----------------------------------- | ----- | ------- | ------ |
| P1    | Backend cookie + MfeConfig metadata | 6h    | —       | ✓ Done |
| P2    | @mfe/sdk (auth + api + federation)  | 4h    | —       | ✓ Done |
| P3    | Caddy gateway (:8080 routing)       | 1.5h  | —       | ✓ Done |


**Wave 1 (Parallel, after P1+P2):** P4, P5, P6


| Phase | Task                                         | Hours | Prereqs  | Status |
| ----- | -------------------------------------------- | ----- | -------- | ------ |
| P4    | Landing app (public, MUI)                    | 3h    | P1+P2    | ✓ Done |
| P5    | Shell app (authenticated, nav, lazy remotes) | 5h    | P1+P2+P3 | ✓ Done |
| P6    | Demo React remote (mount/unmount + api)      | 3h    | P1+P2+P3 | ✓ Done |


**Wave 2 (Sequential):** P7


| Phase | Task                                      | Hours | Prereqs  | Status |
| ----- | ----------------------------------------- | ----- | -------- | ------ |
| P7    | Smoke tests + umbrella README + git hygiene | 2h    | P4+P5+P6 | ✓ Done |




### Phase Breakdown



#### **P1: Backend Cookie + MfeConfig Metadata** (6h)

**Deliverables:**

- `POST /api/v1/auth/login` sets `refresh_token` HttpOnly cookie ✓ delivered
- `POST /api/v1/auth/refresh` reads cookie + rotates ✓ delivered
- `refreshToken` removed from login/refresh JSON responses ✓ delivered — responses carry only `{ userId, accessToken, tokenExpires }`
- Add columns to `MfeConfig`: `routeName`, `title`, `framework`
- Seed stub: demoReact config with DASHBOARD scope
- Seed non-admin user owning DASHBOARD scope
- E2E tests updated (no body `refreshToken` compatibility)

**File ownership:** `backend/`** only

**Rollout:**

1. Add new columns to migration + entity
2. Update DTOs (remove `refreshToken` from response)
3. Implement cookie handling in auth service
4. Update seed for stub remote + dashboard user
5. Rewrite e2e tests
6. Deploy backend



#### **P2: @mfe/sdk** (4h)

**Deliverables:**

- Auth module: `login()`, `register()`, `refresh()`, `logout()`
- API module: axios wrapper with Bearer + auto-refresh
- Federation module: `loadRemote()`, `registerRemotes()` ✓ delivered — exported from `packages/mfe-sdk/src/index.ts` and used by the shell's boot sequence
- In-memory access token (dies on reload)
- Types: `MfeRemoteRef`, `RemoteModule`, `MfeAccessibleItem`
- Unit tests (mocked axios)
- Zero tokens in localStorage

**File ownership:** `packages/mfe-sdk/`** only

**Rollout:**

1. ~~Init repo with Vite build config~~ — **no build step**: the SDK exports raw TS via `exports`/`main`/`types` → `./src/index.ts` and is consumed through `file:` deps
2. Implement auth (login/register/refresh/logout)
3. Implement api (axios wrapper, 401 → refresh → retry)
4. Implement federation (runtime remotes)
5. Unit tests
6. ~~Publish to workspace via `pnpm install`~~ — consumers install with their own manager: **landing uses npm**, shell and demo-react use pnpm (all via `file:` deps)



#### **P3: Caddy Gateway** (1.5h)

**Deliverables:**

- Caddyfile routing:
  - `/` → landing `:5173`
  - `/app/*` → shell `:5174` — the `/app` prefix is **not stripped**: Vite's `base: '/app/'` requires it (see the comment in `gateway/Caddyfile.compose`)
  - `/api/*` → backend `:3000`
  - `/r/demo-react/*` → demo-react `:5175`
- docker-compose.yml (Caddy service)
- Dev routing is **plain HTTP** — all three Caddyfiles listen on `:8080`/`:80` with no `tls` directive; no TLS termination is configured
- No CORS headers in Caddy — cross-origin allow-listing is the backend's `APP_CORS_ORIGIN`
- Cookie flags are set by the **backend**, not the gateway; Caddy sets no cookie directive

**File ownership:** `gateway/`** only (stays with umbrella; no separate VCS)

**Rollout:**

1. Create Caddyfile with reverse proxy rules
2. docker-compose.yml with Caddy image
3. Local testing: `docker compose up`
4. Verify routes via browser



#### **P4: Landing App** (3h)

**Deliverables:**

- Public-facing React + Vite + MUI app
- Routes: `/`, `/login`, `/register`
- Register form → `POST /api/v1/auth/email/register` → redirect `/login`
- Login form → `POST /api/v1/auth/email/login` → set memory token → redirect `/app` (or `?next=`)
- Components: Layout, forms, MUI theme
- No MF consumer (plain Vite app)

**File ownership:** `landing/`** only

**Rollout:**

1. Vite + React 18.3 + MUI 6 scaffold
2. Pages: Landing, Login, Register
3. Forms using @mfe/sdk `login()`, `register()`
4. Styling: MUI theme + responsive
5. Redirect logic



#### **P5: Shell App** (5h)

**Deliverables:**

- Authenticated React + Vite + MUI app (host)
- Boot: `POST /api/v1/auth/refresh` (cookie) → `GET /api/v1/mfe-configs/accessible`
- Nav from `title` + `routeName` (only `framework === 'react'`)
- Routes: `/app/`, `/app/:routeName`
- Remote outlet (renders mount/unmount lifecycle)
- Lazy-load remotes via `loadRemote()`
- MF host config + shared singleton (`react`, `@mfe/sdk`)
- Error handling: 401 → `/login?next=`, 404 → NotFound

**File ownership:** `shell/`** only

**Rollout:**

1. Vite + React + MUI + react-router-dom
2. MF host config (shared singleton)
3. Auth guard (refresh on boot)
4. Fetch `accessible` → render nav
5. Dynamic remote outlet
6. Error boundaries



#### **P6: Demo React Remote** (3h)

**Deliverables:**

- React + Vite app exposing `mount` + `unmount`
- Mount context: `{ basePath, routeName }`
- One authenticated API call (proves singleton)
- MUI styling (matched with shell)
- MF remote config + shared singleton
- No data persistence (stateless stub)

**File ownership:** `remotes/demo-react/`** only

**Rollout:**

1. Vite + React + MUI scaffold
2. Implement `mount(el, ctx)` + `unmount()` exports
3. One `api.get()` call to backend
4. MF remote config
5. Test via shell



#### **P7: Smoke Tests + Umbrella Hygiene** (2h)

**Deliverables:**

- Browser smoke test: register → login → shell → demo-react
- Single git root at the umbrella + `.gitignore` — **no nested repos** in any package
- Umbrella README.md updated (status, architecture, quickstart)
- Phase C spec status: ✓ Complete
- No product code changes (P7 = umbrella config + validation only)

**File ownership:** Umbrella `README.md` + docs (solo monorepo git root)

**Checklist:**

- [x] Browser: `http://localhost:8080` → landing → login → shell → demo-react
- [x] No `:3000`, `:5173`, `:5174`, `:5175` in address bar
- [x] `refresh_token` cookie exists (DevTools)
- [x] No `localStorage` tokens
- [x] Logout → 401 on next refresh
- [x] Dashboard user sees Demo React; scope-less user sees empty nav
- [x] Fake `:routeName` → 404
- [x] Backend `pnpm test` (236) + `pnpm test:e2e` (40) and SDK `pnpm test` (44) green. Landing/shell/demo-react ship **no `test` script** — their gate is `typecheck` + `build`.

*(Checklist status follows the Phase C success evidence recorded under "Success Criteria" below.)*

---

## FE Libs Modernize (Complete ✓) — ~10 hours

**Plan:** executed 2026-09-13; the dated plan folder was consolidated away — form/HTTP rules live in [`docs/code-standards-frontend.md`](code-standards-frontend.md). The older Phase C plan folder no longer exists; the admin remote plan is also completed.

### Completed Deliverables

- ✓ axios replaced `fetch` **inside `packages/mfe-sdk` only** — two instances: `http` (Bearer injection + **one deduped 401** refresh-and-retry) and bare `authHttp` for login/register/refresh/logout, so a bad-password 401 cannot start a refresh loop
- ✓ A dependency-free `src/token.ts` (memory-only) breaks the former `auth ↔ http` import cycle; the 401 handler lazily imports `./auth.js`
- ✓ `api.*` now resolve `AxiosResponse<T>` (read `res.data`) and reject `ApiError { status, body, message }` (`status === 0` = transport failure)
- ✓ Landing Login/Register rewritten on `react-hook-form` + `zodResolver` + MUI `Controller` (+ `landing/src/schemas/auth.ts` mirroring the backend DTO); duplicate-email now matches `errorCode === 'E003'`
- ✓ Shell (`ShellLayout`) and demo (`DemoApp`) adopt `usehooks-ts` and read `res.data` / handle `ApiError`
- ✓ `react-hook-form` `^7.88.0` declared as an MF `shared` singleton in shell + demo-react; **axios deliberately not shared**; `zod`/`@hookform/resolvers` not shared
- ✓ `typecheck` fixed from a no-op to `tsc -b --noEmit`; `@types/node` added to all three apps
- ✓ All three app Dockerfiles now install the SDK's own runtime deps (`axios`) in place — previously the SDK could not resolve inside the containers
- ✓ Landing image hygiene: `landing/Dockerfile` clears `packages/mfe-sdk/node_modules` before installing, so host pnpm-store/darwin binaries copied into the image cannot linger
- ✓ SDK tests **44 vitest tests across 4 spec files**; zero app-level `axios` imports (verified by grep)

**Not done:** nothing is committed — the whole workspace is an uncommitted working tree (git root has zero commits). The user commits manually.

### Admin Remote UI (Phase D5) ✓

**Plan:** [`plans/260913-2113-admin-remote-ui/`](../plans/260913-2113-admin-remote-ui/plan.md) — **10h**, status `completed`. Federation remote `remotes/admin-react` on port **5176**, seeded as `routeName=admin` on scopes `[ADMIN]`. SoftGate + nested CRUD for users, scopes, and MfeConfigs. Inherits the form/HTTP stack above.

### App Launcher + Nested Nav Tree ✓

**Plan:** [`plans/260916-1737-app-launcher-nav-tree/`](../plans/260916-1737-app-launcher-nav-tree/plan.md). Spec: [`docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`](./brainstorm/2026-09-16-app-launcher-nav-tree-spec.md).

- `/app` Home launcher + header Apps = accessible `MfeConfig` widgets (`iconUrl?`)
- Inside `/app/:routeName`, shell drawer = lazy nested `group` \| `route` tree from `GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible` (not the flat config list)
- ADMIN CRUD at `/api/v1/mfe-configs/:id/nav-items` (+ reorder); admin UI `configs/:id/nav`
- Prior “no nested sidebar” applies to **remotes** (no second chrome). **Shell-owned** API nav is the intended chrome.

**Ops:** on a long-lived `make up` volume, run `make migrate` after this lands (`make seed` for demo trees).

---



## Phase D: Vertical Slice (Future, Tentative)

**Planned:** Post-Phase C, Q4 2026 or later  
**Effort:** ~20–30 hours

### Goals

- Prove Vue 3 remotes + Angular remotes work alongside React
- Add shell wrappers for each framework
- Extend the stub remote to a real feature app



### Phases (Tentative)


| #   | Task                                     | Effort | Notes                      |
| --- | ---------------------------------------- | ------ | -------------------------- |
| D1  | Vue remote (same contract as React)      | ~12–16h | ✓ `remotes/demo-vue` — plan `plans/260915-2252-vue-remote-d1-d2/` |
| D2  | Shell Vue wrapper + lazy loading         | (in D1) | ✓ `RemoteOutlet` mounts `framework: 'vue'` |
| D3  | Angular remote                           | 4h     | angular@18 + setup         |
| D4  | Shell Angular wrapper                    | 3h     | Coexist with Vue + React   |
| D5  | Admin remote UI (users, scopes, MfeConfig CRUD) | 10h | ✓ `remotes/admin-react`, port 5176 |
| D6  | Tests + merge all                        | 2h     | Cross-framework e2e (Vue smoke in D1–D2 plan) |


**Out of scope (D):** route ACL, widget view, email verification UI, npm publish SDK

**D5 is shipped:** [`plans/260913-2113-admin-remote-ui/`](../plans/260913-2113-admin-remote-ui/plan.md) — federation remote `remotes/admin-react` on port **5176**, seeded `routeName=admin` on scopes `[ADMIN]`.  
**D1–D2 shipped:** [`plans/260915-2252-vue-remote-d1-d2/`](../plans/260915-2252-vue-remote-d1-d2/plan.md) — `remotes/demo-vue` port **5177**, `routeName=vue` on `[DASHBOARD]`. D3–D4 Angular remain tentative.

### TODO — Port from the reference repo (`vite-micro-frontends`)

**Source:** `/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends`
(git remote `https://github.com/VuThanhThien/micro-frontend.git` — folder name ≠ repo name).
pnpm-workspace monorepo: `host-dashboard/`, `remote-auth/`, `remote-components/`, `remote-vue/`, `types/`.

> ⚠️ **Nothing here is copy-paste.** That repo uses a different federation runtime, style system and data layer:

| Concern | `vite-micro-frontends` | This platform | Consequence |
|---------|------------------------|---------------|-------------|
| Federation | `@originjs/vite-plugin-federation@^1.3.5` — MF 1.x-style classic `remoteEntry.js` container | `@module-federation/vite@1.16.6` — MF 2.0 runtime, `mf-manifest.json`, `type: "module"` | Remotes must be **rebuilt** on our plugin; loading an originjs container as a classic script is exactly what triggers `RUNTIME-008` |
| Styling | Tailwind v4 (`@tailwindcss/vite`) + shadcn-style components | MUI 6 (`sx` + `theme.ts`) | Porting UI = **rewrite in MUI**, not file copy |
| Router | `react-router` 7.4 | `react-router-dom` 6.x | API differences on ported pages |
| Data | `react-query` 3 | `@mfe/sdk` `api.*` (axios → `AxiosResponse` / `ApiError`) | Replace the query layer |
| Vue app | Vue 3.5 + vue-router 4 + **pinia** 3 + `@vueuse/core` | Vue not present yet | New remote; decide whether pinia is shared |
| Module shape | exposes a `./pages` index; no `{mount, unmount}` | `{ mount(el, ctx), unmount() }` | Needs an adapter entry (equivalent of `expose.tsx`) |

**TODO — UI components, theme, demo pages**

- [x] Shared MUI theme package `packages/mfe-ui` (`createTheme(mode)` + mode sync) — plan [`plans/260914-2316-shared-theme-mfe-ui/`](../plans/260914-2316-shared-theme-mfe-ui/plan.md); shell + demo-react + admin-react adopt; landing skipped
- [x] Shell AppBar light/dark toggle (`localStorage` `mfe-ui-mode` + same-tab event; not tokens)
- [x] Layout kit + Home/Dashboard widgets (`@mfe/ui` / `@mfe/ui/widgets`); demo Home + Dashboard — plan [`plans/260915-0001-dashboard-layout-widgets/`](../plans/260915-0001-dashboard-layout-widgets/plan.md)
- [x] App launcher + nested API nav (shell-owned drawer; remotes still no second chrome) — plan [`plans/260916-1737-app-launcher-nav-tree/`](../plans/260916-1737-app-launcher-nav-tree/plan.md)
- [ ] Port remaining feedback components (Loader/Result/…) **per-app** — not into `@mfe/ui`
- [ ] Profile/FAQ/Help and other reference pages — deferred
- [ ] Full reference component catalog / chart Dashboard — deferred

**TODO — Landing → Next.js (deferred)**

- [ ] Migrate `landing/` from Vite React to **Next.js** (separate brainstorm/plan). Do not invest further in Vite landing theme/`@mfe/ui` until that migration lands.
- [ ] After Next.js landing: decide whether public pages consume `@mfe/ui` or a Next-specific theme wrapper.

**TODO — Vue remote(s)**

- [x] Rebuild as `remotes/demo-vue` on `@module-federation/vite@1.16.6`, exposing `{ mount, unmount }`
- [x] Shell Vue branch in `RemoteOutlet` (`framework === 'vue'`)
- [x] Shared list: vue / vue-router / pinia / `@mfe/sdk` (axios stays SDK-internal)
- [x] Gateway `/r/demo-vue*` + seed `framework: 'vue'`, `routeName=vue`
- [x] Theme sync via `mfe-ui-mode` bridge (no `@mfe/ui` React dep in Vue)
- [ ] Angular D3–D4
- [x] Vue SessionGate dual-mode — local `src/auth/` SessionGate + LoginForm; plan [`plans/260916-1603-vue-sessiongate-dual-mode/`](../plans/260916-1603-vue-sessiongate-dual-mode/plan.md)
- [ ] URL-synced Vue router (hosted = memory history today) — TODO

---



## Phase E: Production Hardening (Future)

**Planned:** Post-Phase D, 2027  
**Effort:** 15–20 hours

### Goals

- RBAC (expand from scope-only)
- Pages + per-route ACL
- Email verification + password reset UI
- npm publish of `@mfe/sdk`
- MinIO artifact registry + per-remote version rollback — see the TODO below (no longer merely "optional")



### Key Features

- [ ] Pages model (e.g., Dashboard, Settings, Reports)
- [ ] Per-route ACL (who can view which pages)
- [ ] Email verification on signup
- [ ] Forgot password flow + reset UI
- [x] Admin panel (users, scopes, MfeConfig CRUD) — Phase D5 remote shipped; pages/ACL remain a genuine non-goal (scope-only model is locked)
- [ ] Audit logging
- [ ] Two-factor auth (optional)

### TODO — Remote artifact registry + version rollback (MinIO)

**Goal:** every remote deployment publishes its build to MinIO under a versioned prefix; an admin can list versions and **roll back** a remote without redeploying the shell.

**Why this is cheap here (the enabler):** the shell registers remotes at **runtime** from `GET /api/v1/mfe-configs/accessible` (`registerRemotes`), so rolling back is *changing a pointer* — one DB update, effective on the next `accessible` call. No shell or remote redeploy.

**Decisions (locked 2026-09-13)**

| # | Decision | Consequence |
|---|----------|-------------|
| 1 | **One active version per remote** | Canary / per-scope A-B routing is **out of scope**. `accessible` resolves each config's `active_version_id` → its `remote_entry`; no per-user version selection. |
| 2 | **Rollback is per-remote** | No atomic multi-remote "release train" transaction required; each rollback is an independent pointer update. |
| 3 | **Content hash for integrity** | Signing / provenance deferred — see the integrity note below. |
| 4 | **Keep artifacts indefinitely** | No retention or GC policy in this phase. |

**Blockers to clear first (verified)**

| # | Blocker | Evidence |
|---|---------|----------|
| 1 | `mfe_config` has no version column, and `remote_entry` is **UNIQUE** | `UQ_mfe_config_remote_entry` on `mfe_config(remote_entry)`; also `UQ_mfe_config_remote_name`, `UQ_mfe_config_route_name` — one row per remote means one version |
| 2 | No S3 client exists | `backend/src/libs/aws/aws.module.ts` is an **empty stub** (`@Module({})`); no `@aws-sdk/client-s3` / `minio` in backend deps |
| 3 | No cache headers anywhere | `gateway/Caddyfile*` and every `Caddyfile.static` set **no** `Cache-Control` → a cached `mf-manifest.json` makes rollback a no-op |
| 4 | Must upload the **whole** build, not just `remoteEntry.js` | the manifest references hashed chunks/assets by relative path |

> Precedent for blocker 3: the reference repo already learned it — `remote-auth/nginx.conf` sends `Cache-Control: "no-cache, no-store, must-revalidate"` for the entry file and `"public, max-age=0, must-revalidate"` for the manifest.

**Data model**

- (A) add a `version` column and **drop** the unique on `remote_entry`; `accessible` selects the active row. Fewest migrations, but pollutes the config table's semantics.
- **(B) — recommended:** new table `mfe_config_version` (`config_id` FK, `version`, `remote_entry`, `build_hash`, `uploaded_at`, `uploaded_by`) plus an `active_version_id` pointer on `mfe_config`. Gives history + audit for free, and rollback is a single FK update.

> With **decision 1 locked** (one active version per remote), the (B) pointer shape is exactly right: `accessible` joins `active_version_id` → `mfe_config_version.remote_entry`. No version dimension in the access query.

**Deploy flow**

1. CI builds the remote and uploads the whole `dist/` to `s3://mfe-remotes/<remoteName>/<version>/` — **immutable prefix**, never overwritten.
2. CI calls a backend admin/service endpoint to register the version (`remote_entry = /r/<remoteName>/<version>/mf-manifest.json`); backend **recomputes and verifies `build_hash`** before persisting.
3. An admin (or the pipeline) **activates** it by setting `active_version_id`.
4. Shell fetches `accessible` → versioned `remoteEntry` → runtime loads that exact version.

**Serving (must preserve one origin)**

- The browser **never** talks to MinIO directly. Caddy proxies `/r/<remoteName>/*` to the bucket/prefix (or MinIO sits behind Caddy). Keeps guarantee #1 and the `SameSite=Lax` cookie flow.
- MinIO credentials stay **backend-only**; never exposed to the client.

**Admin UI** (`remotes/admin-react`)

- [ ] "Versions" view per MFE config: version, build hash, upload time, uploader, active flag
- [ ] **Activate / rollback** with confirm; block deleting the active version
- [ ] Show which version is live and when it was activated
- [ ] Deferred (decision 4): retention/GC policy, version diff view

**Cache + immutability**

- `mf-manifest.json` → `no-cache, no-store, must-revalidate`
- hashed chunks/assets → `immutable, max-age=31536000`
- versioned prefix is immutable: a new deploy is a new prefix

**Integrity note (decision 3).** A content hash (SHA-256 of the build, stored as `build_hash`) proves the bytes are **intact** and gives every build an identity (dedup, "same build?" checks). It does **not** prove **who** built it — anyone able to rewrite both the object *and* the DB row can substitute the hash. So the primary controls are process, not cryptography:

- bucket **write** access restricted to CI credentials — no human or dev keys;
- backend **verifies the hash at registration time** rather than trusting the client-supplied value;
- **activation is admin-only and audited**.

Verify-in-the-browser (SRI-style) is **not applicable**: Module Federation loads remotes through dynamic ESM `import()`, which has no SRI attribute. Add signing (sigstore/cosign, or an HMAC with a CI-held key) later **only if** the artifact store and CI sit in different trust domains, or compliance demands provenance.

**Security**

- Bucket is **private**; backend holds S3 credentials via env; Caddy serves read-only.
- Validate `remoteName` / `version` against a strict pattern before composing a path (path-traversal guard).
- Audit who activated which version when (fits the Phase E audit-logging item).

> ⚠️ **Non-goal to amend when this lands:** MinIO / artifact uploads is currently listed as *deferred* in `CLAUDE.md` ("MinIO / artifact uploads (deferred)"), `README.md`, and `docs/project-overview-pdr.md` §7. Implementing this requires amending all three — the same way the Admin UI non-goal was amended for D5.

---



## Dependencies & Blockers



### Phase C Internal Dependencies

```
P1 (backend) ─┐
P2 (sdk)      ├─► P4 (landing)
P3 (gateway)  │
              │
              ├─► P5 (shell) ──┐
              │                ├─► P7 (smoke)
              └─► P6 (remote) ─┘
```

**Critical path:** P1 → P4 (landing can start after P2 alone)

**No merge rule:** Do not merge P5 or P6 without P1 seed + cookie (prevents hardcoding test users).

### Phase C → Phase D

The gates below apply to the **tentative multi-framework phases (D1–D4)** and are currently unmet:

- [ ] Phase C fully deployed and stable — **not met**: production deployment has not been exercised in this repo (no CI, no deploy artifacts)
- [ ] Cookie refresh fully tested in production — **not met**: verified locally only
- [ ] Initial user feedback — not collected

---



## Success Criteria



### Phase B ✓

- [x] Backend API fully operational
- [x] Auth flows secured (JWT + blacklist)
- [x] E2E tests green
- [x] No tokens in logs or URLs



### Phase C ✓

- [x] Browser uses only `:8080`
- [x] Login response has **no** `refreshToken`
- [x] `refresh_token` cookie is HttpOnly
- [x] No tokens in `localStorage` / `sessionStorage`
- [x] Dashboard user sees Demo React; scope-less user sees empty launcher
- [x] Demo-react makes authenticated API call
- [x] Logout clears cookie; refresh then 401
- [x] `?next=https://evil.test` ignored → `/app`
- [x] Backend 236 unit blocks (23 spec files) + 40 e2e blocks (5 suites); SDK 44 tests (4 spec files); browser smoke 9/9; `make smoke` 4/4
- [x] Single git root with per-package `README.md` files — **no nested repos**. (Note: the repo has **zero commits**; everything is untracked on branch `master`.)



### Phase D (Tentative)

- [ ] Vue remote + Angular remote mounted successfully (future)
- [ ] Cross-framework shared singleton (react, vue, angular) (future)
- [x] Admin UI functional — Phase D5: [`plans/260913-2113-admin-remote-ui/`](../plans/260913-2113-admin-remote-ui/plan.md) (`remotes/admin-react` on 5176)
- [x] App launcher + nested API nav — [`plans/260916-1737-app-launcher-nav-tree/`](../plans/260916-1737-app-launcher-nav-tree/plan.md)
- [ ] All tests green

---



## Release Schedule


| Phase | Start        | End        | Status     | Release          |
| ----- | ------------ | ---------- | ---------- | ---------------- |
| B     | 2026-09-12   | 2026-09-13 | ✓ Done     | Local end-to-end; prod unverified |
| C     | 2026-09-13   | 2026-09-13 | ✓ Done     | Local end-to-end; prod unverified |
| D     | TBD (post-C) | TBD        | 📋 Planned | Late 2026        |
| E     | 2027         | 2027       | 📋 Future  | 2027             |


---



## Risks & Mitigations


| Risk                                            | Impact            | Mitigation                                                             |
| ----------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| MF singleton React dupe bloats bundle           | Performance       | All three Vite apps use exact same `react@18.3`; test in DevTools      |
| Cookie not sent to remotes                      | Auth fails        | SDK sets `withCredentials: true` on every request; validate `Set-Cookie` headers |
| Memory access token dies on landing → shell nav | UX breaks         | Shell **must** refresh on boot; document prominently + test explicitly |
| MfeConfig seed URL mismatches prod              | Remote won't load | Seed uses `PUBLIC_GATEWAY_URL` env; test in all environments           |
| E2E break on body `refreshToken` removal        | Regression        | Rewrite e2e in same PR as cookie change; no dual API                   |
| No CI anywhere (no `.github/`)             | Deployments unverified | Design target only: add CI before any production release; there are no pipelines to misconfigure today |


---



## Documentation & Knowledge Transfer



### Ref Documentation

- **Phase B:** `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-spec.md` + `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`
- **Phase C:** `docs/brainstorm/2026-09-13-phase-c-mfe-platform-frontend-spec.md` (executed; the old per-phase plan was consolidated away)
- **FE libs modernize (executed):** [`docs/code-standards-frontend.md`](code-standards-frontend.md) — former plan folder consolidated away; form/HTTP stack documented there
- **Admin remote UI (completed):** [`plans/260913-2113-admin-remote-ui/plan.md`](../plans/260913-2113-admin-remote-ui/plan.md) + `docs/brainstorm/2026-09-13-admin-remote-ui-spec.md`
- **App launcher + nested nav (shipped):** [`plans/260916-1737-app-launcher-nav-tree/plan.md`](../plans/260916-1737-app-launcher-nav-tree/plan.md) + [`docs/brainstorm/2026-09-16-app-launcher-nav-tree-spec.md`](./brainstorm/2026-09-16-app-launcher-nav-tree-spec.md)
- **Cross-remote state:** [`plans/260913-2241-cross-remote-state/plan.md`](../plans/260913-2241-cross-remote-state/plan.md)
- **Architecture:** `docs/system-architecture.md`
- **Code standards:** `docs/code-standards.md` (hub) + `docs/code-standards-backend.md` (§1) · `docs/code-standards-frontend.md` (§2) · `docs/code-standards-sdk.md` (§3)
- **API reference:** `backend/README.md` + Swagger `/api/docs`



### Handoff Checklist

This checklist is **aspirational**: it describes the bar for a real handoff, not the current state of this solo repo.

- [x] All packages have independent `README.md` with setup instructions — `backend/`, `landing/`, `shell/`, `remotes/demo-react/`, `packages/mfe-sdk/`, umbrella `README.md` all exist
- [x] Architecture docs are current — `docs/system-architecture.md` + `docs/codebase-summary.md` reflect the shipped Phase C surface
- [ ] Test coverage meets >80% target — **unverified**: no coverage gate or report exists in the repo
- [ ] No hardcoded credentials or secrets — **unverified**; dev seed credentials exist for local use only
- [ ] CI/CD pipelines configured per repo — **false today**: there is no CI anywhere (no `.github/`) and no nested repos; all pipelines are still to be created
- [x] Deployment runbooks written — `docs/deployment-guide.md` exists (production deployment itself remains unexercised)

---



## Open Questions

1. **Phase A naming:** Should we document Phase A explicitly, or leave it as "undefined/pre-workspace"?
2. **Admin UI ownership:** ~~Phase D — separate repo or part of shell?~~ **Answered:** it ships as its own federation remote, `remotes/admin-react` (port 5176), seeded `routeName=admin` on scopes `[ADMIN]` — see [`plans/260913-2113-admin-remote-ui/`](../plans/260913-2113-admin-remote-ui/plan.md).
3. **npm publish timeline:** Ship `@mfe/sdk` to npm before or after admin UI?
4. **Multi-environment:** How to manage dev/staging/prod Caddy routing and secrets?

---

**Document version:** 1.4  
**Last updated:** 2026-09-16  
**Next review:** After Angular remote experiments (D3–D4) or the next scheduled platform milestone.