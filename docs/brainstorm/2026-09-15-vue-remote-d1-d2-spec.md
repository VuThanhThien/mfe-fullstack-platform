# Design Spec — Vue Remote (Phase D1–D2)

**Date:** 2026-09-15  
**Status:** approved — plan at `plans/260915-2252-vue-remote-d1-d2/`  
**Approach:** MF-first, UI second (Approach 1)  
**Roadmap:** Phase D1 (Vue remote) + D2 (shell Vue wrapper); D3–D4 Angular **out**  
**Reference (port source, not copy-paste):** `/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/remote-vue`  
**Related:** Phase C frontend spec; remote standalone auth (Spec A — React dual-mode; Vue uses **redirect stub** only); multi-surface (React); `docs/project-roadmap.md` Phase D TODO — Vue

**Authority:** Running code in `shell/`, `packages/mfe-sdk`, `backend/` seed/gateway supersedes older roadmap hour estimates. This doc unlocks the first **non-React** remote on `@module-federation/vite@1.16.6`.

---

## 1. Problem statement

Platform đã lock `MfeAccessibleItem.framework: 'react' | 'vue' | 'angular'` và shell `RemoteOutlet` trả `<Unsupported>` cho mọi non-React. Cần prove: Vue 3 remote cùng contract `{ mount, unmount }`, cùng origin gateway, cùng memory access token qua `@mfe/sdk`, coexists với React remotes.

Reference `remote-vue` dùng `@originjs` federation + expose `./pages` — **không** load được trên MF 2.0 runtime của platform (RUNTIME-008). Phải rebuild.

### User stories

- As a platform owner, I open `/app/vue` after login as `dashboard@example.com` and see a Vue dashboard remote (not Unsupported).
- As a dashboard user, I use shell light/dark toggle and the Vue remote follows (`mfe-ui-mode`).
- As a developer, I prove one authenticated `api.get` from Vue uses the **same** in-memory access token as React remotes.
- As a mistaken visitor to the Vue Vite origin alone, I am redirected to platform login (no Vue LoginForm this phase).

---

## 2. Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Phase theme | Vue D1–D2 only (not MinIO / Next landing / CI / Angular) |
| 2 | Hosted vs dual-mode | **Hosted MF primary** + **standalone redirect stub** (no Vue SessionGate / LoginForm) |
| 3 | Depth | Port reference `remote-vue` **core dashboard** (rebuild on pinned MF plugin) |
| 4 | UI stack | **Tailwind v4** (+ radix-vue / existing UI deps needed by tabs) |
| 5 | Vue router (hosted) | **`createMemoryHistory`** (reference pattern — no fight with React Router) |
| 6 | Theme | **Sync** shell `localStorage` key `mfe-ui-mode` + same-tab event |
| 7 | Surface subset | Home + 4 tabs (overview / analytics / reports / notifications); **no** duplicate outer Layout/AppBar; **no** dead auth/settings routes |
| 8 | Registry | `remotes/demo-vue`, `remoteName=demoVue`, `exposedModule=./App`, `routeName=vue`, `title` ≈ `Vue Dashboard`, `framework=vue`, scopes `[DASHBOARD]`, Vite port **5177**, gateway `/r/demo-vue*` |
| 9 | Data | **Hybrid:** keep mock Pinia chart/tab data; **one** `api.get('/api/v1/users/me')` on Overview |
| 10 | Delivery approach | **MF-first, UI second** |
| 11 | Mount contract | Unchanged: `{ basePath, routeName, locale?, onNotify? }` — no token |
| 12 | HTTP | `@mfe/sdk` `api.*` only — **never** `import axios` in the Vue remote |
| 13 | Federation pin | `@module-federation/vite@1.16.6` |

---

## 3. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | MF-first, UI second | **Selected** — fail federation/seed/outlet early; then port dashboard |
| 2 | UI-port-first | Rejected — RUNTIME-008 / expose issues late |
| 3 | Thin wrapper around reference tree | Rejected — pulls Layout/auth/originjs assumptions |

**Mode / depth / UI alternatives** (brainstorm): dual-mode Vue LoginForm deferred; stub-only remote rejected in favor of reference port; plain CSS / Vuetify rejected in favor of Tailwind.

---

## 4. Architecture & components

### Deployable layout

```
remotes/demo-vue/                 # pnpm, Vue 3.5 + Vite 5
  vite.config.ts                  # federation name: demoVue; base /r/demo-vue/ on build
  src/exposes/app.ts              # { mount, unmount } — one module-level app root
  src/main.ts                     # standalone stub: refresh → mount OR redirect login
  src/App.vue                     # dashboard shell (tabs) — content only, no platform AppBar
  src/router/                     # createAppRouter({ mode: 'embedded' | 'standalone' })
  src/stores/                     # pinia: dashboard (mock) + theme (bridge to mfe-ui-mode)
  src/views/                      # HomeView + dashboard/* tabs (port)
  src/components/ui/**            # only deps required by those tabs
  Dockerfile                      # static Caddy like other remotes; install file: @mfe/sdk
```

### Shell

```
RemoteOutlet
  unknown routeName     → NotFound
  framework === 'react' → ReactRemote (existing)
  framework === 'vue'   → VueRemote (new — same loadRemote / mount / unmount / error / retry)
  else                  → Unsupported
```

- `VueRemote` mirrors `ReactRemote` lifecycle; **does not** `import 'vue'`.
- `loadRemote` already framework-agnostic (`RemoteModule` = `{ mount, unmount }`).

### Platform wiring

| Layer | Change |
|-------|--------|
| Seed | Add row: `routeName=vue`, `remoteEntry=${gateway}/r/demo-vue/mf-manifest.json`, `remoteName=demoVue`, `exposedModule=./App`, `framework=vue`, scopes `[DASHBOARD]` |
| Gateway | `handle /r/demo-vue*` → `:5177` (dev) / `demo-vue:80` (compose); update all Caddyfile variants + README |
| Compose | Service `demo-vue` + smoke path for manifest |
| Makefile smoke | Optional 5th route check for `/r/demo-vue/mf-manifest.json` |

### MF `shared` (remote)

| Package | Shared singleton? | Notes |
|---------|-------------------|--------|
| `vue` | yes | Future multi-Vue ready |
| `vue-router` | yes | |
| `pinia` | yes | |
| `@mfe/sdk` | yes | **Critical** — same memory token as React |
| `axios` | **no** | SDK-internal only |
| Tailwind / radix-vue / unovis | no | Bundled in remote CSS/JS |

Shell wave-1: **do not** add `vue` to shell `shared` (shell never imports Vue). Revisit when a second Vue remote needs host-assisted singleton.

### Isolation

| Unit | Owns | Does not own |
|------|------|--------------|
| `remotes/demo-vue` | Vue UI, Tailwind, Pinia, memory router, expose | Shell chrome, login UI, axios, cookie Domain |
| `shell` Vue branch | framework branch + mount lifecycle | Vue runtime |
| `@mfe/sdk` | unchanged contract | Vue helpers |
| Backend seed | registry row | UI |

---

## 5. Data flow & interfaces

### Hosted (primary)

1. Shell `Gate`: `refresh()` → `accessible` → `registerRemotes()`.
2. Nav shows **Vue Dashboard** for users with `DASHBOARD` (alongside Products / Articles).
3. Navigate `/app/vue` → `VueRemote` → `loadRemote({ remoteName: 'demoVue', exposedModule: './App', … })`.
4. `mount(el, { basePath: '/app/vue', routeName: 'vue', locale?, onNotify? })`:
   - `createApp` + Pinia + router **`mode: 'embedded'`** (`createMemoryHistory`)
   - Theme store subscribes to `mfe-ui-mode` (+ storage/event) → toggles Tailwind `dark` on remote root
   - Overview tab: `api.get('/api/v1/users/me')` → show identity snippet; charts remain mock
5. Navigate away / unmount → `app.unmount()`; clear root ref.

**URL:** Browser URL stays `/app/vue` (and splat unused for Vue tabs). Tab switches are **in-memory only** — no deep-link to `/app/vue/analytics` this phase.

### Standalone stub (`main.ts`)

1. `setRedirectPolicy('standalone')`.
2. Attempt `refresh()` (cookie only works if same-site / `COOKIE_DOMAIN` / future topology).
3. **On failure:** redirect to platform login — `VITE_PUBLIC_LOGIN_URL` (default `http://localhost:8080/login`) with `?next=` sanitized via policy (expect bounce to `/app` after landing login; not back to `:5177` without cookie Domain).
4. **On success:** mount same dashboard root into `#root` with router `mode: 'standalone'` (`createWebHistory`) for rare/prod-ready cookie cases.
5. **No** Vue `LoginForm` / `SessionGate`. Local UI DX for this phase = **shell at `:8080/app/vue`** (remote Vite HMR via gateway or hybrid host remotes).

### Theme bridge

- Read `localStorage.getItem('mfe-ui-mode')` (`light` | `dark`) — same key as shell `@mfe/ui`.
- Listen shell same-tab custom event (existing shell pattern) + `storage` for cross-tab.
- Apply/remove `dark` class on remote mount element (Tailwind dark mode).
- Hide or repurpose reference `DarkModeButton` — shell AppBar owns toggle when hosted.

### Optional mount hooks

- `onNotify`: Overview may emit success/error for `/users/me` failure (shell Snackbar only — no `refreshAccessibles`).
- `locale`: optional `documentElement.lang` pass-through; no i18n framework required.

### Unchanged

- Access = memory; refresh = HttpOnly cookie  
- ADMIN does not bypass `accessible`  
- axios only inside `@mfe/sdk`  
- No `?token=` on remoteEntry  

---

## 6. Error handling & edge cases

| Case | Behavior |
|------|----------|
| `framework: 'vue'` before shell branch ships | `<Unsupported>` (current) — ship shell + seed together |
| `loadRemote` / mount throw | Outlet error panel + Retry (same as ReactRemote) |
| `/users/me` fails (401) | SDK refresh-and-retry; hard fail → login redirect (shell policy) |
| `/users/me` fails (non-auth) | Show inline error on Overview; mock charts still render; optional `onNotify` |
| Theme key missing | Default `light` (match shell default) |
| Double mount / strict mode | Single module-level app root; `unmount` idempotent |
| User without DASHBOARD | No nav item (scope gate) |
| Angular / unknown framework | Still `<Unsupported>` |
| Standalone on `:5177` after landing login | Cookie typically **not** sent (host-only) → remains redirect loop to login — **accepted** for Mode C; document shell as DX path |
| CSS leak | Prefer remote root wrapper + Tailwind preflight scoped as far as practical; accept some global Tailwind risk — document as known limitation |

---

## 7. Testing strategy

| Layer | What |
|-------|------|
| Remote | `vue-tsc` / `typecheck` + `pnpm build` (federation manifest emitted) |
| Shell | `typecheck` + `build` with Vue branch |
| SDK | Existing tests unchanged (contract already framework-agnostic) |
| Backend | Seeder upsert for `vue`; unit/e2e only if seeder tests exist / touch |
| Smoke | `make smoke` includes `/r/demo-vue/mf-manifest.json` **200** |
| Browser (manual or script) | Login `dashboard@…` → nav **Vue Dashboard** → mount → Overview shows `/users/me` identity → shell theme toggle flips Vue dark class → Products (React) still works same session → no tokens in `localStorage` except non-auth `mfe-ui-mode` |
| Negative | `framework` typo / missing manifest → outlet error or Unsupported |

**Out of test scope this phase:** Vue unit/component suite beyond typecheck; Angular; standalone cookie SSO; deep-link Vue tabs.

---

## 8. Implementation considerations & risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| MF Vue + shared singleton misconfig | Blank outlet / duplicate Vue | MF-first stub before UI port; verify manifest `type: module` |
| Tailwind preflight fights MUI | Global style clash | Root wrapper; limit preflight; visual check in shell |
| Porting full `components/ui` | Scope creep | Only UI needed by 4 tabs; drop unused (range-calendar etc.) unless imported |
| `@unovis/vue` weight | Bundle size | Keep for analytics/overview fidelity; drop only if build blockers |
| Memory router vs URL shared-state docs | Confusion | Spec explicit: Vue tabs not in URL; React remotes unchanged |
| Hour estimate D1+D2 = 7h on roadmap | Underestimate for reference port | Plan **~12–16h** (MF wiring ~4–5h + UI port ~8–11h) |
| `remoteHmr` | Dev pain | Match React remotes: `remoteHmr: false` until MF fixes |

### Wave order (plan input)

1. Scaffold `remotes/demo-vue` + expose stub `{ mount, unmount }` + Dockerfile  
2. Gateway + compose + seed `vue`  
3. Shell `VueRemote` branch  
4. Port dashboard UI + theme bridge + `/users/me`  
5. Standalone redirect stub + smoke + docs (`roadmap`, `CLAUDE.md`, code-standards, codebase-summary)

### File ownership

| Area | Owner folder |
|------|----------------|
| Vue remote | `remotes/demo-vue/` only |
| Shell outlet | `shell/src/pages/RemoteOutlet.tsx` (+ thin extract if needed) |
| Seed | `backend/src/database/seeds/…` |
| Gateway / compose | `gateway/`, `docker-compose.yml` |
| Docs | umbrella `docs/`, `CLAUDE.md`, package READMEs |

Do **not** publish `@mfe/sdk` to npm; keep `file:` dep.

### Non-goals (amend later if needed)

- Vue SessionGate / LoginForm in `@mfe/ui`  
- Angular D3–D4  
- Vue tab deep-linking on shell URL  
- Pinia shared across multiple Vue remotes (only one remote)  
- Landing Next.js, MinIO, CI  
- Copy originjs `remoteEntry` or reference monorepo workspace layout  

---

## 9. Success metrics & validation

- [ ] `dashboard@example.com` sees nav **Vue Dashboard** (`routeName=vue`)
- [ ] `/app/vue` mounts Vue app — not `<Unsupported>`
- [ ] Overview shows authenticated `/users/me` fields (proves SDK singleton with React)
- [ ] Four tabs navigate in-memory without breaking shell React Router
- [ ] Shell theme toggle updates Vue Tailwind dark mode
- [ ] React remotes (product / article / admin) still mount same session
- [ ] No access/refresh tokens in `localStorage` / `sessionStorage` (only `mfe-ui-mode`)
- [ ] `GET /r/demo-vue/mf-manifest.json` → 200 via gateway
- [ ] Standalone `:5177` without session redirects to platform login (no Vue login UI)
- [ ] `typecheck` + `build` green for `demo-vue` + shell; backend seed applies cleanly

---

## 10. Next steps & dependencies

1. **User review / approve this spec** (status → approved).  
2. Run `/plan` → `plans/YYMMDD-HHMM-vue-remote-d1-d2/plan.md` with `status: pending`, phased ownership matching §8 waves.  
3. Implement per plan; update `docs/project-roadmap.md` D1–D2 checkboxes when done.  
4. Follow-ups (separate specs): Vue dual-mode SessionGate; URL-synced Vue router; Angular D3–D4; second Vue remote → shell `shared.vue`.

**Dependencies:** Phase C + D5 + standalone React path already shipped; reference repo readable on disk; Node 20.18 + pnpm 9.12.3 via `.dev-bin/env.sh`.

---

**Document version:** 1.0  
**Last updated:** 2026-09-15  
**Effort band:** ~12–16h (not roadmap’s 7h stub estimate)  
