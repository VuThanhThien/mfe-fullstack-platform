# Design Spec — Vue SessionGate Dual-Mode

**Date:** 2026-09-16  
**Status:** approved — plan at `plans/260916-1603-vue-sessiongate-dual-mode/`  
**Approach:** Thin Vue gate mirroring `@mfe/ui/auth` API (Approach 1)  
**Roadmap:** Vue follow-up after D1–D2; URL-synced hosted router **deferred (TODO)**  
**Related:** Spec A remote standalone auth (`2026-09-15-remote-standalone-auth-spec.md`); Vue D1–D2 (`2026-09-15-vue-remote-d1-d2-spec.md`); `demo-react/src/main.tsx`

**Authority:** Running code in `remotes/demo-vue/`, `packages/mfe-ui/src/auth/`, `packages/mfe-sdk` supersedes older Mode C redirect docs once this ships.

---

## 1. Problem statement

`remotes/demo-vue` standalone (`:5177`) is Mode C: `refresh()` fail → redirect to platform `login` URL. Cookie is host-only without `COOKIE_DOMAIN`, so landing login does not hydrate `:5177`. React remotes already have dual-mode: hosted expose ungated; standalone wraps `SessionGate` + `LoginForm` from `@mfe/ui/auth`.

Vue cannot import `@mfe/ui/auth` (React + MUI). Need local Vue equivalents so team DX = backend + `demo-vue` only, same contract as Spec A.

### User stories

- As a Vue remote developer, I run backend + `pnpm dev` on `:5177`, sign in on that origin, and call Nest via `@mfe/sdk` without shell or landing.
- As a hosted user, `/app/vue` still mounts with **no** login UI inside the remote (shell Gate owns session).
- As security, access stays memory-only; refresh HttpOnly; no tokens in `localStorage` / URL.
- As platform, URL-synced Vue tabs under `/app/vue/*` remain a **later TODO** (hosted stays `createMemoryHistory`).

---

## 2. Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Plan track | Vue SessionGate dual-mode **only** |
| 2 | URL-synced hosted router | **Out** — keep as roadmap TODO |
| 3 | Auth UI location | **Local** `remotes/demo-vue/src/auth/` — no `@mfe/ui`, no `mfe-ui-vue` |
| 4 | Form stack | Lightweight `ref`/`reactive` + `zod.safeParse` (add `zod` dep) |
| 5 | Schema rules | Mirror `@mfe/ui/auth` `loginSchema` (email + password min 1) — local copy, not import |
| 6 | Standalone 401 / session loss | **Mirror React** — stay on `:5177`; `SessionGate` shows login; `setRedirect` → `safeStandalonePath` |
| 7 | Hosted expose | **Unchanged** — `mount` / `mountStandalone` in `exposes/app.ts` stay ungated |
| 8 | Approach | Thin Vue gate mirroring `@mfe/ui/auth` SessionGate FSM + presentational LoginForm |
| 9 | Register / email-verify in Vue | Out of scope |
| 10 | Shell / gateway / seed | No changes |

---

## 3. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | Thin Vue gate mirroring `@mfe/ui/auth` API | **Selected** |
| 2 | Composable-only + inline login in `main.ts` | Rejected — weak boundary, hard to test |
| 3 | New `packages/mfe-ui-vue` | Rejected — YAGNI (one Vue remote) |

---

## 4. Architecture & components

```
remotes/demo-vue/
  src/
    auth/
      SessionGate.vue       # bootstrap FSM (checking | ready | login)
      LoginForm.vue         # presentational Tailwind form; no sdk imports
      loginSchema.ts        # zod — same rules as @mfe/ui/auth
      resolveLoginError.ts  # ApiError → user string (mirror demo-react)
    StandaloneRoot.vue      # wires gate + login + mountStandalone
    main.ts                 # setRedirectPolicy + setRedirect + createApp(StandaloneRoot)
    exposes/app.ts          # UNCHANGED hosted/standalone mount API
```

### Dual-mode contract

| Mode | Entry | SessionGate? |
|------|--------|--------------|
| Hosted MF | shell → `mount(el, ctx)` | **No** |
| Standalone | `main.ts` → `SessionGate` → `mountStandalone` | **Yes** |

### SessionGate.vue

Mirror `packages/mfe-ui/src/auth/SessionGate.tsx`:

- Props: `bootstrap: () => Promise<void>`
- Slots: `login({ unreachable, retry })`; default slot = children when `ready`
- States: `checking` (render null) | `ready` | `login(unreachable: boolean)`
- Unreachable when error has `status === 0` (transport / `ApiError`)
- Keep `bootstrap` in a ref/watch pattern so inline lambdas do not re-fire forever

### LoginForm.vue

Mirror `LoginForm` props surface (not MUI):

- Props: `onSubmit(values)`, `error?`, `disabled?`, `title?` (default `"Sign in"`)
- Fields: email, password; field errors from `safeParse`; parent `error` for server messages
- Tailwind; fit demo-vue dashboard look (no MUI)
- **No** `login` / `refresh` / `api` imports

### main.ts / StandaloneRoot

Mirror `remotes/demo-react/src/main.tsx`:

1. `setRedirectPolicy('standalone')`
2. `setRedirect((url) => window.location.assign(safeStandalonePath(next, '/')))`
3. `createApp(StandaloneRoot).mount('#app')`
4. Gate `bootstrap={() => refresh().then(() => undefined)}`
5. Login slot: unreachable banner + Retry; `LoginForm` → `login(values)` → `retry()`
6. Default slot / on ready: call `mountStandalone` on the app root element with `{ basePath: '/', routeName: 'vue' }`

**Mount detail:** Prefer StandaloneRoot owning a dedicated `#remote-root` (or reuse `#app` child) so SessionGate UI and dashboard root do not fight. Pattern: when ready, render a host `div` ref and `onMounted`/`watch` call `mountStandalone(el, ctx)` once; on unmount gate teardown call `unmount()` from expose.

Remove Mode C `VITE_PUBLIC_LOGIN_URL` redirect helper from the happy path (may leave env unused / delete from README).

---

## 5. Data flow & interfaces

```
Standalone boot
  → setRedirectPolicy('standalone') + setRedirect(safeStandalonePath)
  → SessionGate.bootstrap = refresh()
       success → mountStandalone → Pinia + vue-router(webHistory) + App
       fail status===0 → login slot unreachable=true
       fail other → login slot unreachable=false
  → LoginForm submit → sdk.login → retry bootstrap → ready

Mid-session 401 (api.*)
  → sdk interceptor refresh-or-redirect
  → setRedirect → safeStandalonePath → full navigation on :5177
  → SessionGate re-bootstrap → LoginForm if refresh still fails

Hosted (unchanged)
  → shell Gate refresh + accessible
  → loadRemote demoVue → mount(el, ctx) — no SessionGate
```

### Interface contracts

| Symbol | Contract |
|--------|----------|
| `loginSchema` | `{ email: z.email, password: z.string().min(1) }` |
| `LoginFormValues` | `z.infer<typeof loginSchema>` |
| `resolveLoginError(err)` | 401/422 → invalid credentials; 429 → rate limit; 0 → unreachable; else generic |
| Mount ctx | Unchanged `{ basePath, routeName, locale?, onNotify? }` — no token |

### Deps

- Add `zod` to `remotes/demo-vue` dependencies (version align with other apps / `^4.6` if platform uses zod 4).
- Do **not** add vee-validate, react-hook-form, or `@mfe/ui`.

---

## 6. Error handling & edge cases

| Case | Behavior |
|------|----------|
| Bad password | LoginForm shows resolveLoginError; stay on form |
| API down on boot | `unreachable` banner + Retry; LoginForm still available |
| Double mount / HMR | Expose `unmount` before remount; StandaloneRoot calls `unmount` on teardown |
| Hosted path | No gate — regressions = fail this plan |
| Cookie after login on `:5177` | Vite `/api` proxy → Set-Cookie for `localhost:5177` — works without `COOKIE_DOMAIN` |
| Cross-origin after landing login | Still no SSO to `:5177` without `COOKIE_DOMAIN` — **accepted**; dual-mode login is on the remote origin |
| Tokens in storage | Forbidden except non-auth `mfe-ui-mode` |

---

## 7. Testing strategy

| Layer | What |
|-------|------|
| Remote | `pnpm typecheck` + `pnpm build` in `remotes/demo-vue` |
| Shell / React | Smoke unchanged — no shell edits expected; quick hosted `/app/vue` manual check |
| Unit | Optional lightweight tests for `loginSchema` / `resolveLoginError` only if cheap; **not** required to add Vue test runner this plan |
| Browser (manual or script) | Unauth `:5177` → LoginForm (not platform redirect); login `dashboard@…` → dashboard; hard refresh keeps session via cookie+refresh; logout/401 → LoginForm again; no access token in `localStorage` |
| Negative | Hosted shell mount still works without nested login |

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Gate remount loops with Pinia/router | Call `mountStandalone` once per ready transition; track mounted flag; `unmount` on leave ready |
| Zod major mismatch | Pin to same major as landing/`@mfe/ui` |
| Tailwind login looks alien | Reuse demo-vue tokens/spacing; keep form minimal |
| Docs still say Mode C | Update `demo-vue` README, roadmap checkbox, `code-standards-frontend`, CLAUDE Vue follow-up line |
| Scope creep to URL sync | Explicit TODO only — do not change `createMemoryHistory` for embedded |

### File ownership

| Area | Owns |
|------|------|
| Vue auth + standalone entry | `remotes/demo-vue/**` |
| Docs | `docs/project-roadmap.md`, `docs/code-standards-frontend.md`, `CLAUDE.md`, `remotes/demo-vue/README.md` (and related public docs if they mention Mode C) |
| Must not touch | `packages/mfe-ui`, shell outlet, gateway, backend seed, other remotes |

### Wave order (plan input)

1. Add `zod` + `src/auth/*` (schema, resolveLoginError, SessionGate, LoginForm)  
2. `StandaloneRoot.vue` + rewrite `main.ts`; verify mount/unmount lifecycle  
3. Docs + typecheck/build + browser verify; leave URL-synced router as TODO  

---

## 9. Success metrics & validation

- [ ] Unauthenticated visit to `http://localhost:5177/` shows **local** LoginForm (no redirect to `:8080/login`)
- [ ] Valid login → Vue dashboard mounts; Overview `/users/me` still works
- [ ] Hard refresh on `:5177` rehydrates via `refresh()` (cookie on Vite origin)
- [ ] Failed login shows inline error; no tokens in `localStorage`/`sessionStorage`
- [ ] Hosted `http://localhost:8080/app/vue` (after shell login) still mounts **without** Vue LoginForm
- [ ] `pnpm typecheck` + `pnpm build` green in `remotes/demo-vue`
- [ ] Roadmap: Vue SessionGate dual-mode marked done; URL-synced Vue router remains open TODO

---

## 10. Out of scope / deferred TODO

- URL-synced Vue router (hosted `createWebHistory` under `/app/vue/*`) — **roadmap TODO**
- Vue auth in `@mfe/ui` or `packages/mfe-ui-vue`
- Angular D3–D4
- MinIO / CI / Next.js landing
- Register / forgot-password on Vue remote
- Changing hosted memory router

---

## 11. Next steps

1. Implementation plan: `plans/260916-1603-vue-sessiongate-dual-mode/`  
2. `/cook --auto` that plan  
3. Later brainstorm/plan: URL-synced Vue hosted router  

---

**Document version:** 1.0  
**Last updated:** 2026-09-16
