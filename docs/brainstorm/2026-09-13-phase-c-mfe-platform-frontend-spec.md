# Design Spec — Phase C: MFE Platform Frontend

**Date:** 2026-09-13  
**Status:** approved — plan at `plans/260913-1735-phase-c-mfe-platform/`  
**Approach:** Caddy gateway (Approach 2) + MUI  
**Workspace folder:** `micro-frontend-fullstack-2026/` (not a git monorepo)  
**Repos (this phase):** `backend/` (delta), `landing/`, `shell/`, `remotes/demo-react/`, `packages/mfe-sdk/`  
**Glue (not a git repo):** `gateway/`

Predecessor: Phase B spec + [implementation notes](./2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md). Where B and the running `backend/` disagree, **code wins**. This spec only adds FE platform + the narrow backend deltas below.

Reference (behavior to *not* copy): `viblo-mfe-auth` — Angular/webpack shell, widget view, `localStorage` token, `?token=` on `remoteEntry`, metadata inside JS loaders.

---

## 1. Problem statement

Phase B đã có Nest auth (access 15m + refresh + session + Redis blacklist), users, scopes, `MfeConfig`, `GET /api/v1/mfe-configs/accessible`. Chưa có FE.

Cần nền host thật: cùng origin, cookie refresh, contract federation mà Vue/Angular/admin **inherit** — không phải demo widget như viblo.

Phase C = **platform first**: landing+login, React shell, `@mfe/sdk`, 1 remote stub React, Caddy, delta backend (cookie + metadata trên `MfeConfig`). Không admin UI, không Vue, không Angular, không widget, không route ACL.

### User stories

- As a visitor, I see a landing page and can register or log in.
- As a newly registered user, I am sent to login (no auto-session). Email verify stays backend-only; no verify UI this phase.
- As an authenticated user, I land in the shell; nav lists only remotes I can access.
- As an authenticated user, opening a nav item lazy-loads that remote into `/app/:routeName`.
- As a remote, I call Nest through `@mfe/sdk` and share the shell’s in-memory access token.
- As the platform, refresh lives in an `HttpOnly` cookie; JS never sees it.

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| Phase slice | Platform first — landing, shell, sdk, 1 React stub. Vue / Angular / admin / route ACL = later |
| Origin | Same origin via **Caddy** (`:8080` dev). `/` landing, `/app` shell, `/api` Nest, `/r/demo-react` stub |
| Tokens | Access **memory only**. Refresh **cookie `HttpOnly`** (`refresh_token`, `Path=/`, `SameSite=Lax`, `Secure` only in production). Login/refresh **omit `refreshToken` from JSON** |
| Repos | Polyrepo (Phase B). Extra git: `landing/`, `shell/`, `remotes/demo-react/`, `packages/mfe-sdk/`. Consume sdk via `file:` this phase. No npm publish |
| Federation | `@module-federation/vite`. Remotes registered at **runtime** from `accessible`. Not hardcoded in shell `vite.config` |
| Route metadata | On `MfeConfig`: `routeName` (unique), `title`, `framework`. Remote exposes `{ mount, unmount }` only |
| Remote API auth | `@mfe/sdk` as MF **singleton** (`shared`). Remotes `import { api }`. `mount` does **not** receive a token |
| UI kit | React + Vite + **MUI** (landing + shell + stub chrome) |
| Remote JS | Public. Entitlement = `accessible` only. No `?token=` on `remoteEntry` |
| Views | App-view only. No widget, no channels |
| Register | Existing `POST /auth/email/register` → `{ userId }` only. Then `/login` |
| Shell frameworks | This phase **mounts `react` only**. `vue` / `angular` in nav → placeholder, no `loadRemote` |

---

## 3. Evaluated approaches

### 3.1 Phase slice

| # | Name | Verdict |
|---|------|---------|
| A | Platform first | **Selected** — unlock auth + federation before multiplying remotes |
| B | Vertical slice (all 5 apps, thin) | Rejected — Angular-on-Vite would block landing/admin |
| C | Everything + route ACL | Rejected — needs Pages model; Phase B deferred it for a reason |

### 3.2 Origin / session

| # | Name | Verdict |
|---|------|---------|
| A | Same origin + gateway | **Selected** |
| B | Two origins + `localStorage` | Rejected — XSS on 1-day refresh; viblo debt |
| C | Landing as a shell remote | Rejected — user wants a standalone landing app |

### 3.3 Token storage

| # | Name | Verdict |
|---|------|---------|
| A | Both tokens in `localStorage` | Rejected — gateway without security gain |
| B | Memory access + HttpOnly refresh | **Selected** — narrow backend reopen |
| C | Both tokens HttpOnly | Rejected — CSRF surface too big for this phase |

### 3.4 Repo topology

| # | Name | Verdict |
|---|------|---------|
| A | Strict polyrepo | Partial — kept, **plus** `packages/mfe-sdk` |
| B | `web/` pnpm workspace | Rejected — user kept Phase B polyrepo |
| C | Umbrella monorepo | Rejected in Phase B (nested git) |

### 3.5 Federation

| # | Name | Verdict |
|---|------|---------|
| A | `@module-federation/vite` | **Selected** |
| B | `@originjs/vite-plugin-federation` | Rejected — weaker Angular path; upstream migrating to A |
| C | Native Federation | Rejected — Angular-host ecosystem |
| D | Bare `import()` | Rejected — no shared singleton; contract dies next phase |

### 3.6 Route metadata

| # | Name | Verdict |
|---|------|---------|
| A | Inside remote JS (viblo) | Rejected — must execute every remote to draw nav |
| B | On `MfeConfig` | **Selected** — lazy-load; identity for future ACL |
| C | Both must match | Rejected — YAGNI |

### 3.7 Remote token

| # | Name | Verdict |
|---|------|---------|
| A | Shared `@mfe/sdk` singleton | **Selected** |
| B | Inject `getAccessToken` via `mount` | Rejected — every remote reimplements HTTP |
| C | Each remote refreshes via cookie | Rejected — races; many auth clients |

### 3.8 Gateway

| # | Name | Verdict |
|---|------|---------|
| 1 | Landing Vite as edge | Rejected — prod rewrite; marketing app owns infra |
| 2 | Caddy as origin | **Selected** |
| 3 | Shell Vite as edge | Rejected — unauthenticated traffic hits the auth host |

---

## 4. Architecture

### 4.1 Folder / repos

```
micro-frontend-fullstack-2026/          # umbrella, not a git root
├── backend/                            # existing git — cookie + MfeConfig columns
├── landing/                            # new git — React Vite MUI
├── shell/                              # new git — React Vite MUI host
├── remotes/
│   └── demo-react/                     # new git — stub app-view
├── packages/
│   └── mfe-sdk/                        # new git — auth + api + loadRemote
├── gateway/                            # NOT a git repo — Caddyfile + compose overlay
└── docs/brainstorm/                    # this spec
```

| Path | Git | Role |
|------|-----|------|
| `backend/` | yes | Cookie refresh; `routeName` / `title` / `framework`; unique `remoteName` |
| `landing/` | new | `/` always public. `/login` + `/register`. If `/login` boots and `refresh()` succeeds → redirect `next` or `/app` |
| `shell/` | new | `/app`, nav, lazy remote |
| `remotes/demo-react/` | new | Proves contract |
| `packages/mfe-sdk/` | new | Shared client. Apps depend via `"@mfe/sdk": "file:../packages/mfe-sdk"` (path adjusted per repo) |
| `gateway/` | no | `Caddyfile` + `docker-compose.yml` **only Caddy**. Backend compose unchanged. Dev order: backend compose → gateway → three Vite apps |

No `file:` between apps. Vue / Angular / `manager/` still future repos.

### 4.2 One origin (Caddy `:8080`)

Internal listen (not exposed to the browser in the happy path):

| Service | Internal |
|---------|----------|
| landing | `:5173` |
| shell | `:5174` |
| demo-react | `:5175` |
| backend | `:3000` (existing) |

```
http://localhost:8080/                 → landing :5173
http://localhost:8080/login            → landing
http://localhost:8080/register         → landing
http://localhost:8080/app/*            → shell :5174   (Vite base `/app/`)
http://localhost:8080/api/*            → backend :3000
http://localhost:8080/r/demo-react/*   → demo-react :5175
```

Vite `base`: landing `/`, shell `/app/`, stub `/r/demo-react/`.  
`remoteEntry` stored in DB **must** be the gateway URL, e.g. `http://localhost:8080/r/demo-react/remoteEntry.js`.

### 4.3 `@mfe/sdk`

| Export | Role |
|--------|------|
| `login` / `register` / `refresh` / `logout` | Auth. `refresh` uses cookie, empty body |
| `api` | `fetch` wrapper: relative `/api`, Bearer from memory, 401 → one refresh → retry |
| `getAccessToken` | Tests / debug. Remotes do not call this |
| `loadRemote` / `registerRemotes` | `@module-federation/vite` runtime |
| Types | `MfeRemoteRef`, `MfeAccessibleItem`, `RemoteModule` |

Landing uses the package via `file:` (not federated). Shell + stub: MF `shared` singleton `@mfe/sdk`, `react`, `react-dom`.

Memory dies on full navigation. **Shell boot always `refresh()`** before `accessible`. Landing after login holds access only until `location = /app`.

### 4.4 Shell

1. `refresh()` — 401 → `/login?next=<current /app path>`
2. `GET /api/v1/mfe-configs/accessible`
3. Nav from `title` + `routeName`
4. `/app/:routeName` in list + `framework === 'react'` → `loadRemote` → `mount`
5. Leave route → `unmount()`
6. Logout → sdk + redirect `/login`

### 4.5 Remote stub

Expose **one** module matching `exposedModule` in seed:

```ts
{ mount(el, { basePath, routeName }), unmount() }
```

Uses `import { api } from '@mfe/sdk'` for one authenticated call (proves singleton). No widget, no channels, no `appView` flag.

### 4.6 Backend delta (only this)

**Auth**

- `POST /api/v1/auth/email/login` — `Set-Cookie: refresh_token=...`; body `{ userId, accessToken, tokenExpires }` — **no `refreshToken`**
- `POST /api/v1/auth/refresh` — public; reads cookie; empty body; rotates cookie; body `{ userId, accessToken, tokenExpires }` (same as login). Shell does not decode the JWT for identity
- `POST /api/v1/auth/logout` — still `ApiAuth` (Bearer); blacklist session; `Clear-Cookie`
- Cookie flags: `HttpOnly`, `Path=/`, `SameSite=Lax`, `Max-Age` = refresh TTL (existing `AUTH_REFRESH_TOKEN_EXPIRES_IN`). `Secure` iff `APP_ENV=production`
- Redact `req.cookies.refresh_token` in logs (extend `loggingRedactPaths`)

**MfeConfig** — new columns (NOT NULL; empty-or-seeded table, no backfill story):

| Column | Rules |
|--------|--------|
| `route_name` | unique; stored lowercase; `^[a-z0-9-]{2,40}$` |
| `title` | 1–80 chars |
| `framework` | enum `react` \| `vue` \| `angular` |

Also unique index on `remote_name` (MF container names collide).  
`remote_entry` unique already exists.

Create/Update DTO add the three fields.  
`accessible` **includes** them (still **omits** `scopes`).

### 4.7 Seed

Idempotent addition (do not break existing admin / `DASHBOARD` seeds):

- One `MfeConfig`: stub via gateway URL, `remoteName=demoReact`, `exposedModule=./App`, `routeName=demo`, `title=Demo React`, `framework=react`, scope `DASHBOARD`
- A **non-admin** demo user owning `DASHBOARD` (so `accessible` is non-empty without using `ADMIN`). Password documented as dev-only, same class as `admin@example.com` / `12345678`

`ADMIN` still does **not** bypass `accessible` intersection (Phase B).

### 4.8 Explicitly out

- Admin UI, Vue app, Angular app
- Widget view / event bus
- Pages / per-route ACL
- Auth on `remoteEntry` files / RS256
- Access token cookie
- CSRF token (SameSite=Lax + same-site Caddy POSTs)
- Email-verify / forgot-password UI (endpoints stay stubs/jobs as today)
- npm publish of `@mfe/sdk`
- Making `gateway/` or the umbrella a git repo

---

## 5. Data flow & interfaces

### 5.1 Auth

```
Register  POST /api/v1/auth/email/register  { email, password }
          → existing status + { userId }     // no cookie (unchanged)
          → landing → /login
          → BE may still enqueue verify email; no FE for it

Login     POST /api/v1/auth/email/login     { email, password }
          → Set-Cookie refresh_token
          → { userId, accessToken, tokenExpires }
          → sdk memory = access
          → location = safe next (see §6) or /app

Shell boot
          POST /api/v1/auth/refresh         body {}  + cookie
          → rotate cookie + { userId, accessToken, tokenExpires }
          → 401 → /login?next=...

Logout    POST /api/v1/auth/logout          Bearer
          → blacklist + Clear-Cookie
          → sdk.clear() → /login
```

`credentials: 'include'` on every sdk request.

Refresh **in-flight dedupe**: concurrent 401s share one `refresh()` promise.

### 5.2 Shell → remotes

```
refresh OK
  → GET /api/v1/mfe-configs/accessible
  → nav from title + routeName
  → /app/:routeName
       missing from list        → shell NotFound
       framework !== 'react'    → placeholder, no loadRemote
       react                    → loadRemote → mount(el, { basePath, routeName })
  → navigate away               → unmount()
```

### 5.3 Remote → API

```
api.get('/api/v1/...')
  → Authorization: Bearer <memory>
  → 401 → refresh once (deduped) → retry
  → refresh 401 → clear → /login?next=...
```

Remote does not read the cookie or persist tokens.

### 5.4 `@mfe/sdk` contract

```ts
login(dto: { email: string; password: string }): Promise<{ userId: string; tokenExpires: number }>
register(dto: { email: string; password: string }): Promise<{ userId: string }>
refresh(): Promise<{ userId: string; tokenExpires: number }>
logout(): Promise<void>
api: {
  get/post/put/patch/delete(path, body?, init?): Promise<Response>
}
getAccessToken(): string | null
registerRemotes(cfgs: MfeRemoteRef[]): void
loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule>

type MfeRemoteRef = {
  remoteEntry: string
  remoteName: string
  exposedModule: string
}

type RemoteModule = {
  mount(
    el: HTMLElement,
    ctx: { basePath: string; routeName: string },
  ): void | Promise<void>
  unmount(): void | Promise<void>
}

type MfeAccessibleItem = MfeRemoteRef & {
  id: string
  routeName: string
  title: string
  framework: 'react' | 'vue' | 'angular'
}
```

`mount` context is routing only. No user object, no token, no event bus.

### 5.5 MfeConfig write (ADMIN / seed)

```
POST/PATCH {
  remoteEntry, remoteName, exposedModule,
  routeName, title, framework,
  scopeNames: string[]          // ≥1; existing names only
}
```

Unique: `remoteEntry`, `remoteName`, `routeName`.  
`routeName` lowercased on write.  
`framework` validated by class-validator enum.  
PATCH: omitted fields unchanged (Phase B semantics). `scopeNames` present → replace set.

### 5.6 CORS

Happy path is same-origin through Caddy — CORS unused.  
Still set `APP_CORS_ORIGIN` to include `http://localhost:8080` if anyone bypasses Caddy in dev. Cookie `Domain` is **unset** (host-only on `:8080`).

---

## 6. Error handling

Reuse Nest exception filter / error DTO. FE maps status + `errorCode` to MUI alerts. No parallel error taxonomy.

| Case | Status / UX |
|------|-------------|
| Bad login | 401 generic (unchanged). Form error. No cookie set |
| Register duplicate email | 422/E003 (existing). Stay on `/register` |
| Refresh missing/invalid/blacklisted cookie | 401. Shell/landing → `/login`. No stack toast |
| Logout without valid access | 401. Client still `clear()` + `Clear-Cookie` best-effort (logout should not trap the user) |
| Access expired on API call | sdk refresh + **one** retry. Second 401 → login |
| Missing `ADMIN` on write MfeConfig | 403 (unchanged) |
| Duplicate `routeName` / `remoteName` / `remoteEntry` | 409 (same unique-index mapping as today) |
| Invalid `routeName` / `framework` / empty `scopeNames` | 422 ValidationPipe |
| Unknown `scopeNames` | 400/E006 (unchanged) |
| Unknown config id | 404 |
| `?next=` open redirect | Allow only paths matching `^/app(/.*)?$`. Anything else → `/app` |
| `accessible` empty | Shell chrome + empty state. Not an error |
| `loadRemote` / `mount` throws | Error panel **in the outlet**. Nav remains. Retry button |
| `framework` not `react` | Placeholder in outlet (“Not supported in this build”). No fetch of remoteEntry |
| Unknown `:routeName` | Shell NotFound. Do not call `loadRemote` |
| Caddy / remote origin down | Same as `loadRemote` failure |
| Cookie on `http://localhost` | `Secure=false` so it works. Prod must be HTTPS + `Secure` |

Do not put tokens in `console.log`, Sentry breadcrumbs, or Caddy access logs query strings. No token on URLs.

---

## 7. Testing strategy

### Backend (required — extend Phase B suite)

- Login sets `refresh_token` cookie; JSON has `accessToken` and **does not** contain `refreshToken`
- Refresh with cookie + empty body succeeds; rotates cookie; returns new access
- Refresh without cookie → 401
- Logout blacklists + clears cookie; subsequent refresh 401
- Create MfeConfig requires `routeName`, `title`, `framework`; unique violations → 409
- `accessible` includes `routeName`, `title`, `framework`; still omits `scopes`
- Seed: dashboard user sees stub; user with no scopes sees `[]`
- Existing e2e that posted `refreshToken` in body **must be rewritten** in the same change. No compatibility body token

### `@mfe/sdk` (required — unit, mocked `fetch`)

- Access not written to `localStorage` / `sessionStorage`
- 401 → single refresh → retry; parallel 401s = one refresh
- Refresh 401 → `clear` + callers reject
- `next` helper (if in sdk) rejects non-`/app` paths

### FE (required checklist; Playwright optional)

Manual (or Playwright against `:8080` if added in-plan):

- Register → login → `/app` shows stub nav for dashboard user
- Hard refresh on `/app` still authenticated (cookie refresh)
- Logout → `/login`; `/app` bounces to login
- Admin user with only `ADMIN` and no `DASHBOARD` → empty nav (intersection unchanged)
- Stub `api` call returns 2xx
- Fake `routeName` in URL → NotFound

Out: load tests, visual regression, email-verify e2e, Vue/Angular wrappers.

CI: `backend` repo keeps current pipeline. New FE repos: lint + unit (sdk + shell/landing if they have tests). No umbrella CI.

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Memory access lost on landing → shell navigation | Documented; shell **must** refresh on boot. Do not “optimize” this away |
| MF singleton version skew | All three Vite apps pin the same `@mfe/sdk` via `file:` and same `react` major. Document in sdk README |
| Angular/Vue later cannot consume the React-shaped `mount` | Contract is already framework-agnostic (`mount`/`unmount` on a DOM node). Wrappers live in **shell** next phase, not in remotes |
| Caddy `base` mismatch (blank assets) | Fix Vite `base` + Caddy `handle_path` together; one smoke hit of `/app` and `/r/demo-react/remoteEntry.js` |
| Cookie not sent | `credentials: 'include'` + host-only cookie on `:8080`. Do not set `Domain=localhost` |
| Existing auth e2e break | Rewrite in the same backend PR as cookie change; do not leave a dual body+cookie API |
| `file:` deps painful on Windows/CI | Accept for this phase; npm publish is a later TODO (Phase B already listed `@org/api-types`) |
| Stub remoteEntry URL wrong in seed | Seed uses gateway origin from env `PUBLIC_GATEWAY_URL` default `http://localhost:8080` |
| MUI + MF duplicate React | `react` / `react-dom` singleton in shell + stub shared config |

**Effort:** ~3–6 days for someone who knows the Phase B backend and Vite MF (cookie+schema ~1d, sdk ~1d, three apps + Caddy ~2–3d, tests ~1d). Angular-in-React is **not** on this clock.

---

## 9. Success metrics / validation

- [ ] `landing/`, `shell/`, `remotes/demo-react/`, `packages/mfe-sdk/` are independent git repos; umbrella is not a git root; `gateway/` is not a repo
- [ ] Browser uses **only** `:8080`. No login flow depends on `:5173` / `:3000` in the address bar
- [ ] Login response has no `refreshToken`; DevTools shows `refresh_token` HttpOnly
- [ ] Application tab: no access/refresh in `localStorage` / `sessionStorage`
- [ ] Hard refresh `/app` stays logged in
- [ ] Dashboard-scoped user sees Demo React; scope-less user sees empty nav
- [ ] Opening Demo React mounts stub; stub authenticated API call succeeds
- [ ] Logout clears cookie; refresh then 401
- [ ] `?next=https://evil.test` ignored → `/app`
- [ ] Backend e2e + sdk unit green
- [ ] No widget code, no Vue/Angular apps, no admin app, no Pages table

---

## 10. Next steps

1. User approves this spec (or requests edits)
2. `/plan` with this path → implementation plan (backend delta, sdk, gateway, three Vite apps, seeds, tests)
3. Later phases (own spec): Vue remote, Angular remote + shell wrappers, admin (users/scopes/MfeConfig UI), optional route ACL

**Dependencies:** running Phase B `backend/` (Postgres + Redis + seed admin). Do not port viblo `auth-service`.

---

## 11. Sources

- `micro-frontend-fullstack-2026/backend` — auth, scopes, MfeConfig, `accessible`
- `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-spec.md` + implementation notes
- `viblo-mfe-auth` — negative reference (widgets, webpack host, token-in-URL)
- `@module-federation/vite` — runtime remotes + shared singleton
