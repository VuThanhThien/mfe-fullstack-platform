# Design Spec — Admin Remote UI (Phase D5)

**Date:** 2026-09-13  
**Status:** approved — plan at `plans/260913-2113-admin-remote-ui/`  
**Approach:** Federation remote in shell (Approach 1)  
**Package:** `remotes/admin-react/`  
**Predecessor:** Phase C platform ([spec](./2026-09-13-phase-c-mfe-platform-frontend-spec.md)); Phase B ADMIN CRUD APIs

Where this spec conflicts with older “Admin UI = out of scope” notes in Phase C / CLAUDE non-goals: **this spec supersedes for Admin UI only**. Scope-only authz, no ADMIN `accessible` bypass, and remote contract remain locked.

---

## 1. Problem statement

Admin login (`admin@example.com`, scope `ADMIN`) sees **empty shell nav**. By design: `accessible` requires scope ∩ config scopes; seeded demo remote uses `DASHBOARD` only. ADMIN does **not** bypass intersection.

Platform already has ADMIN-gated REST for users, scopes, mfe-configs. No FE to manage them — ops must use Swagger/curl. Roadmap D5 called for Admin UI; this pulls it forward as a **federation remote**, not shell-embedded pages.

### User stories

- As an admin, after login I see an **Admin** nav item (and only remotes whose scopes intersect mine).
- As an admin, I CRUD **users**, **scopes**, and **MfeConfigs** (incl. scope assignment = entitlement).
- As a non-admin, I do not see Admin in nav; if I somehow load the remote JS, I see a Forbidden screen; API still 403s.
- As the platform, Admin remote obeys the same `{ mount, unmount }` + `@mfe/sdk` singleton contract as `demo-react`.

### Non-goals

- Permissions / RBAC table (Phase E)
- Per-route ACL / Pages model
- ADMIN bypass of `accessible`
- Standalone `/admin` SPA (landing-style)
- SDK public API expansion (`hasScope` publish) — decode JWT locally in remote
- Backport `demo-react` to use mount `ctx` (optional follow-up)
- Vue/Angular admin

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| Authz model | Scope-only; “routes” = MfeConfig metadata (`routeName`, `title`, `framework`, …) |
| Delivery | Federation remote `remotes/admin-react` inside shell |
| MVP depth | Full CRUD Users / Scopes / MfeConfigs |
| In-app nav | Nested routes under `basePath` from mount ctx |
| Client gate | Soft check JWT `scopes` ∋ `ADMIN` → Forbidden UI; server remains source of truth |
| Backend APIs | Reuse existing; **seed only** (no new endpoints) |
| Soft guards (UI) | Cannot delete self; cannot delete scope named `ADMIN` |
| Port / path | Vite **5176**; gateway `/r/admin-react*`; seed `routeName=admin` |

---

## 3. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | Mirror `demo-react` + seed `ADMIN` | **Selected** — fixes empty nav; proves registry; ~8–12h |
| 2 | Admin pages inside shell | Rejected — breaks remotes-from-registry story |
| 3 | Remote + SDK `hasScope` helpers | Deferred — YAGNI until 2nd consumer |

---

## 4. Architecture

```
Browser :8080
  /app/admin/*  → shell → loadRemote(admin MfeConfig)
                      → mount(el, { basePath: '/app/admin', routeName: 'admin' })
  /r/admin-react/* → Caddy → Vite :5176
  /api/v1/users|scopes|mfe-configs → Nest (ADMIN scope required on mutations/lists)
```

### Seed `MfeConfig` (idempotent)

| Field | Value |
|-------|--------|
| `remoteEntry` | `{PUBLIC_GATEWAY_URL}/r/admin-react/mf-manifest.json` |
| `remoteName` | `adminReact` |
| `exposedModule` | `./App` |
| `routeName` | `admin` |
| `title` | `Admin` |
| `framework` | `react` |
| `scopes` | `[ADMIN]` |

### Package layout

```
remotes/admin-react/
  vite.config.ts          # base /r/admin-react/, port 5176, federation name adminReact
  src/expose.tsx          # mount(el, ctx) / unmount
  src/AdminApp.tsx        # SoftGate + Router basename=ctx.basePath
  src/lib/jwt-scopes.ts   # decode access token payload.scopes (no verify — UX only)
  src/lib/api/*.ts        # thin wrappers on sdk api()
  src/pages/users|scopes|configs/
  src/components/         # ConfirmDialog, ScopeMultiSelect, ErrorAlert, …
```

### SoftGate

1. `getAccessToken()` from `@mfe/sdk`
2. Base64url-decode JWT payload; read `scopes: string[]`
3. Missing token / missing `ADMIN` → `<Forbidden />` (no shell redirect)
4. Pass → render nested routes

---

## 5. Data flow & interfaces

### Mount contract (Phase C — admin must implement)

```ts
mount(el: HTMLElement, ctx: { basePath: string; routeName: string }): void | Promise<void>
unmount(): void | Promise<void>
```

Shell already passes ctx (`shell/src/pages/RemoteOutlet.tsx`).

### Nested routes (`basename = ctx.basePath`)

| Path | Page |
|------|------|
| `/` | redirect → `users` |
| `/users` | list + create dialog/page |
| `/users/:id` | edit user + `scopeNames` |
| `/scopes` | list + create |
| `/scopes/:id` | edit |
| `/configs` | list + create |
| `/configs/:id` | edit metadata + `scopeNames` |

### API mapping (existing)

| UI action | Method | Path |
|-----------|--------|------|
| List users | GET | `/api/v1/users` |
| Create user | POST | `/api/v1/users` body incl. optional `scopeNames` |
| Get user | GET | `/api/v1/users/:id` |
| Update user | PATCH | `/api/v1/users/:id` (`scopeNames` replace-set when present) |
| Delete user | DELETE | `/api/v1/users/:id` |
| List/create/update/delete scopes | | `/api/v1/scopes` … |
| List all configs (ADMIN) | GET | `/api/v1/mfe-configs` |
| Create/update/delete config | | `/api/v1/mfe-configs` … |

Use `api` from `@mfe/sdk` (`credentials: 'include'`, Bearer, 401 refresh). Prefer offset pagination already exposed by list DTOs.

### Scope assignment semantics

- User / config: `scopeNames` absent → unchanged; present non-empty → full replacement; `[]` → 422 (backend).
- UI: multi-select of existing scopes; never invent names client-side without create-scope first.

---

## 6. Error handling & edge cases

| Case | Behavior |
|------|----------|
| SoftGate fail | Forbidden panel in outlet |
| API 403 | Toast/alert; stay on page |
| API 404 | Alert + navigate back to list |
| API 422 / 400 | Field-level or form error from Nest message |
| Delete self | Button disabled + tooltip |
| Delete scope `ADMIN` | Button disabled |
| Delete scope/user/config in use | Show server error text; no silent ignore |
| Empty lists | Empty state + primary Create CTA |
| Token expired mid-form | SDK refresh+retry; second 401 → `/login` |

---

## 7. Testing strategy

| Layer | What |
|-------|------|
| Unit (remote) | `jwt-scopes` decode; SoftGate render; optional form validation helpers |
| Manual / smoke | Login admin → nav shows Admin; CRUD happy path each domain; login `dashboard@` → no Admin nav |
| Gateway | `curl -I :8080/r/admin-react/mf-manifest.json` → 200 |
| Regression | Demo remote + dashboard user still works; ADMIN still no demo unless granted `DASHBOARD` |

No requirement for Playwright in this phase; extend `Makefile` smoke + optional `scripts/e2e-admin-remote.mjs` mirror of demo script.

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Two Reacts / hook errors | Pin same versions + MF `shared` singletons as shell/demo |
| Admin edits own remoteEntry / scopes off ADMIN | Confirm dialog; document “can lock yourself out of Admin nav” |
| Seed URL drift | Idempotent heal like demo seeder (`remoteEntry` → mf-manifest) |
| Nested router vs shell router | `BrowserRouter` **basename**=`basePath` only inside remote |
| Solo monorepo | No nested `git init` in package |

**Glue edits (allowed):** `gateway/*`, seed in `backend/`, `Makefile`, umbrella README/docs pointers, docker-compose if remote is a service.

**Must not:** change `accessible` semantics; add permissions table; put tokens in storage.

---

## 9. Success metrics

- [ ] `admin@example.com` login → shell nav contains **Admin**
- [ ] Open Admin → Users / Scopes / Configs nested routes work; deep-link refresh OK under `/app/admin/...`
- [ ] Create user + assign `DASHBOARD` → that user sees Demo after re-login/refresh token
- [ ] Create/edit MfeConfig scopes visible in ADMIN list; `accessible` for target users updates after their next token refresh (≤15m) or re-login
- [ ] Non-admin: no Admin nav; SoftGate Forbidden if force-mounted
- [ ] Delete-self and delete-`ADMIN`-scope blocked in UI
- [ ] No `localStorage` / `sessionStorage` token writes
- [ ] Happy path address bar stays on `:8080`

---

## 10. Next steps & dependencies

1. Implementation plan: `plans/260913-2113-admin-remote-ui/`
2. Depends on: Phase C shell + sdk + gateway patterns (already shipped)
3. After ship: update `docs/project-roadmap.md` D5 status; amend CLAUDE/README non-goals line for Admin UI

---

**Effort estimate:** ~10h (seed 1h + gateway 0.5h + scaffold/gate/router 2h + three CRUD domains ~5h + smoke/docs 1.5h)
