# Design Spec — Remote Standalone Auth (Dual-Mode SPA)

**Date:** 2026-09-15  
**Status:** approved — plan at `plans/260915-1117-remote-standalone-multi-surface/`  
**Approach:** Platform dual-mode kit (Approach 2)  
**Package for login UI:** `@mfe/ui` (not a separate auth package)  
**Follow-up:** Spec B — multi-surface / multi-expose remotes (separate doc)

**Authority:** Running code in `backend/`, `packages/mfe-sdk`, `packages/mfe-ui`, remotes, landing, shell supersedes older specs where they conflict. This doc unlocks **team-local remote/landing without shell**.

---

## 1. Problem statement

Khi tách team, mỗi remote phải **chạy và authenticate độc lập** (local: chỉ cần backend). Production remote vẫn có thể là SPA trên subdomain **và** vẫn bị shell mount qua Module Federation (`{ mount, unmount }`).

Hiện tại access token chỉ hydrate khi shell `Gate` gọi `refresh()`; remote standalone không có session bootstrap. Cookie refresh chưa có `Domain` → chưa sẵn SSO cross-subdomain cho prod SPA portfolio.

### User stories

- As a remote team, I run **backend + my remote only** locally, sign in, and call Nest via `@mfe/sdk` without shell or landing.
- As a landing developer, I run **backend + landing only** locally with the same cookie/memory rules.
- As the platform, production remotes may be standalone SPAs on `*.platform.tld` with shared HttpOnly refresh (`Domain=.platform.tld`) **and** remain embeddable in the shell.
- As a hosted remote (shell mount), I **never** show a login form; shell already authenticated.
- As security, access stays memory-only; refresh stays HttpOnly; no `localStorage` / `?token=` on `remoteEntry`.

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| Scope of this spec | Standalone / dual-mode **auth only** (Spec A). Multi-expose → Spec B |
| Prod remote shape | Full SPA on subdomain **and** MF `expose` (dual-mode) |
| Cookie SSO (prod) | `Domain=.platform.tld` (parent) |
| Login UI | Shared **`LoginForm` (+ optional SessionGate helper) in `@mfe/ui`** |
| Local team DX | **No shell required** — backend + app under test |
| Local cookie | **No** `COOKIE_DOMAIN` (host-only on Vite origin); Vite proxies `/api` → backend |
| Prod vs local env | Explicit split (see §3) |
| Entry decides mode | `standalone/main.tsx` vs `expose.tsx` — not runtime guess |
| Mount contract | Unchanged — no token on `mount` ctx |
| Caddy `*.mfe.local` parity | **Optional follow-up**, not default local path |
| Register / email-verify in remote | Out of scope |

---

## 3. Environment split

| Concern | **local (team standalone)** | **prod (platform)** |
|---------|-----------------------------|---------------------|
| Processes | Backend + landing **or** one remote | Landing, shell, remotes, gateway, backend |
| Shell | Not required | Required for hub / MF composition |
| Browser origin | `http://localhost:517x` (per app) | `https://{app}.platform.tld` |
| API reachability | Vite `server.proxy['/api']` → Nest | Gateway or `api.platform.tld` (same-site) |
| `COOKIE_DOMAIN` | Unset / empty → omit `domain` attribute | `.platform.tld` |
| SSO across apps | No (login per app origin if needed) | Yes via shared Domain cookie |
| Remote entry | Standalone `SessionGate` | Dual: standalone SPA + shell `mount` |
| `make up` path-based `:8080` | Remains supported for integrated smoke; Spec A does not require switching default compose to multi-host | Subdomain topology |

**Backend env**

- `COOKIE_DOMAIN` — optional string; only passed to `res.cookie` / `clearCookie` when non-empty.
- Existing: `NODE_ENV` drives `secure` on cookie (prod only).

**Frontend app env (illustrative)**

- No need for `VITE_APP_MODE` to choose Gate vs mount — **entrypoint** chooses.
- API base: relative `/api` (proxy or same-host gateway) preferred so `withCredentials` stays simple.
- Prod absolute API host only if gateway design requires it; must remain credential-compatible with cookie Domain.

---

## 4. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | Minimal SoftGate + copy-paste login per remote | Rejected — drift |
| 2 | Platform dual-mode kit (`@mfe/ui` LoginForm + cookie Domain + dual entry) | **Selected** |
| 3 | Per-remote BFF / token exchange | Rejected — overkill, fights Nest cookie model |
| — | Dev-only mock auth | Rejected earlier — not prod SPA |
| — | Redirect-only to landing login | Rejected — weaker offline/team DX when landing not running |

---

## 5. Architecture & components

### Dual runtime

| Mode | Entry | Auth | Chrome |
|------|--------|------|--------|
| Hosted | `expose.tsx` → `{ mount, unmount }` | Shell `Gate` already refreshed; shared `@mfe/sdk` singleton | Shell layout / nav |
| Standalone SPA | `standalone/main.tsx` (name flexible) | `SessionGate`: `refresh()` → `LoginForm` → app routes | Minimal remote-owned chrome |

### Component map

```
backend/          COOKIE_DOMAIN → refreshCookieOptions()
packages/mfe-ui/  LoginForm + zod schema + optional SessionGate helper
                  (still NO axios — apps pass login/refresh via props/callbacks)
packages/mfe-sdk/ auth helpers unchanged; safe redirect helper extended for standalone
landing/          consume LoginForm; local = backend + landing only
remotes/*         expose.tsx (no SessionGate) + standalone entry (SessionGate)
shell/            Gate semantics unchanged
gateway/          prod subdomain routing; local default may stay :8080 integrated
```

### Naming

- **`SessionGate`** — session bootstrap (auth).  
- **Admin `SoftGate`** — scope UX only; unchanged; must not be conflated.

### Boundaries

- Access = memory; refresh = HttpOnly cookie (± Domain).
- Hosted path never renders LoginForm.
- No tokens in `localStorage` / `sessionStorage` / URL.
- `@mfe/ui` may contain **presentational** auth widgets; HTTP stays in `@mfe/sdk` / app wiring.

---

## 6. Data flow & interfaces

### Standalone

```
SessionGate
  refresh() ─withCredentials─► POST /api/v1/auth/refresh
    ok  → memory access → App
    401 → LoginForm
            login() ► POST /api/v1/auth/email/login
              ok → Set-Cookie refresh_token → memory access → App
  api.* → Bearer memory; 401 → SDK refresh-and-retry (existing)
```

### Hosted

```
Shell Gate → refresh → accessible → registerRemotes
RemoteOutlet → loadRemote → mount(el, ctx)
expose.tsx → App   // no SessionGate
```

### Interfaces

| Surface | Contract |
|---------|----------|
| `LoginForm` (`@mfe/ui`) | Props: `onSubmit(dto) => Promise<void>`, `error?: string`, optional footer slot. No Nest imports. |
| `SessionGate` (`@mfe/ui` optional) | `bootstrap: () => Promise<void>`, `renderLogin`, `children`. App supplies `() => refresh()`. |
| `RemoteMountContext` | Unchanged: `basePath`, `routeName`, `locale?`, `onNotify?`. |
| Cookie options | `httpOnly`, `path=/`, `sameSite=lax`, `secure` in prod, `domain` iff `COOKIE_DOMAIN` set. |
| Post-login / 401 redirect | Standalone: same-origin app login path. Hosted/shell: keep current landing/`/app` behavior. |

### SDK redirect note

Today `safeNext` only allows `^/app(/.*)?$` (shell). Spec A requires an **explicit** extension or sibling helper for standalone (e.g. same-origin relative paths only, or allowlist of parent-domain absolute URLs in prod). Open redirect remains forbidden.

### `@mfe/ui` README delta

Previously: “Not in this package: … auth …”.  
After Spec A: auth **UI** (LoginForm / SessionGate helper) allowed; still no axios, no token storage, no router ownership required inside the package.

---

## 7. Error handling

| Case | Behavior |
|------|----------|
| `refresh()` 401 / no cookie | Show LoginForm (do not require shell) |
| `refresh()` / API `status === 0` | LoginForm + “API unreachable” banner; Retry on bootstrap |
| `login()` 401 | Form error (landing parity) |
| `login()` 5xx / 0 | Form error; keep email draft |
| Hosted mount without token | Platform bug — remote does **not** show LoginForm |
| Admin SoftGate | Unchanged Forbidden UX; Nest `@RequireScopes` is authz source of truth |
| Missing `COOKIE_DOMAIN` in prod | Per-host login still works; cross-subdomain SSO fails — docs/deploy warning |
| Logout (standalone) | `logout()` → clear memory + clear cookie (same option flags) → app `/login` |

No degraded auth via `localStorage` or query tokens.

---

## 8. Testing strategy

### Unit

- Backend cookie options: domain present iff env set; secure only prod.
- `@mfe/ui` LoginForm: zod, `onSubmit`, error display; guarantee no axios import.
- SessionGate: bootstrap ok/fail/network per §7.
- SDK redirect helper: standalone same-origin; prod allowlist; reject external.

### Integration

- **demo-react standalone** + backend only (no shell): login → authenticated UI / `users/me`.
- **demo-react hosted**: mount path shows no LoginForm.
- **landing**: silent refresh + LoginForm from `@mfe/ui`.

### Smoke / e2e

- Standalone puppeteer (or extend `scripts/e2e-demo-remote.mjs` variant): no access token in web storage.
- Existing `make smoke` / shell path must not regress.
- Optional later: subdomain + `COOKIE_DOMAIN` SSO.

### Success metrics

1. Backend + demo-react standalone login works without shell/landing.  
2. Same remote still mounts in shell without duplicate login.  
3. `COOKIE_DOMAIN` only when configured.  
4. No access token in `localStorage` / `sessionStorage`.

---

## 9. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Dual entry basename / router drift | One shared `App` route tree; basename from `mount` ctx vs standalone base |
| `safeNext` shell-centric today | New helper or parameterized allowlist before standalone 401 redirect |
| Teams forget Vite `/api` proxy | SessionGate network banner; document in remote README + local-dev guide |
| Prod Domain typo | Deploy checklist; cookie clear on logout must use same `domain` |
| `@mfe/ui` scope creep | LoginForm presentational only; no auth state store in UI package |
| Integrated `:8080` vs future subdomains | Keep `make up` working; subdomain is prod (and optional parity), not blocking local DX |

**Reference remote for the slice:** `remotes/demo-react` first; `admin-react` follows same dual-entry pattern after demo proves cookie + SessionGate.

**Landing:** adopt shared LoginForm in same effort or immediately after demo standalone green.

---

## 10. Out of scope / non-goals

- Multi-expose / multiple nav entries per deployable remote → **Spec B**
- Vue/Angular remotes, widget view, event bus
- Changing scope-only authz or ADMIN bypass on `accessible`
- Mandatory local Caddy multi-host
- Email verify / forgot-password UI
- Publishing `@mfe/sdk` / `@mfe/ui` to npm

---

## 11. Dependencies & next steps

1. User approves this spec.  
2. `/plan` for Spec A implementation (backend cookie env, `@mfe/ui` LoginForm, demo standalone entry, SDK redirect helper, docs).  
3. Brainstorm **Spec B** (multi-surface remotes) — independent cycle.  
4. Optional follow-up: local `*.mfe.local` parity profile.

---

## 12. Validation checklist (acceptance)

- [ ] `COOKIE_DOMAIN` empty → cookie has no Domain attribute  
- [ ] `COOKIE_DOMAIN=.platform.tld` → Domain set on login/refresh/logout clear  
- [ ] demo-react standalone: backend only → login → API 200  
- [ ] demo-react in shell: no LoginForm; remote still works  
- [ ] LoginForm lives in `@mfe/ui`; apps wire `@mfe/sdk`  
- [ ] No access token in web storage after login  
- [ ] Docs: local team workflow vs prod dual-mode env table  

---

**Last updated:** 2026-09-15
