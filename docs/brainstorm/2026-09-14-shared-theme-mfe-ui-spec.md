# Design Spec — Shared Theme (`@mfe/ui`) + Demo Showcase

**Date:** 2026-09-14  
**Status:** approved (brainstorm) — plan at `plans/260914-2316-shared-theme-mfe-ui/`  
**Approach:** Approach 1 — Theme platform + slim demo showcase (~10–12h)  
**Package:** `packages/mfe-ui/` (theme tokens + mode I/O only)  
**Plan:** [`plans/260914-2316-shared-theme-mfe-ui/plan.md`](../../plans/260914-2316-shared-theme-mfe-ui/plan.md) (`status: pending`, ~11h)  
**Predecessor:** Cross-remote state ([spec](./2026-09-14-cross-remote-state-spec.md)); Phase D roadmap TODO (UI/theme port from `vite-micro-frontends`); Admin D5

Where this spec conflicts with “no root shared UI package” / “landing owns the only theme.ts”: **this spec adds `@mfe/ui` for shell + remotes**. Landing stays out of scope. Auth token storage rules unchanged.

---

## 1. Problem statement

Authenticated apps look inconsistent: landing has a minimal MUI theme; shell has **no** `ThemeProvider`; admin uses default `createTheme()`; demo has none. Roadmap Phase D TODO asks to port theme/components from the reference repo (`vite-micro-frontends`) — **rewrite in MUI**, not Tailwind/file copy.

Separate React roots (shell vs `mount()`) mean MUI context does **not** cross remotes — mode sync must be explicit.

Demo remote is still a single stub panel; reference has Home/status-style pages worth a slim showcase.

### User stories

- As a signed-in user, shell + remotes share one light/dark look after I toggle mode in the shell AppBar.
- As a dashboard user, `/app/demo` shows a themed Home (profile via `api.*`) and `/app/demo/status` a themed status/Result page; hard refresh on nested path still works.
- As a developer, I import `createTheme` / mode helpers from `@mfe/ui` (`file:`), not from another app.
- As the platform, theme preference may live in `localStorage`; **access/refresh tokens never do**.

### Non-goals

- Landing adoption of `@mfe/ui` this phase
- Landing → Next.js (**roadmap TODO only** — separate brainstorm later)
- React components inside `@mfe/ui` (Loader/Result/Title stay per-app)
- Chart-heavy reference Dashboard / full component catalog
- `@mfe/ui` in Module Federation `shared`
- `themeMode` on `RemoteMountContext` (Guarantee #8 unchanged)
- Vue/Angular, MinIO, pnpm workspace conversion
- Visual snapshot / pixel parity with reference

---

## 2. Decisions locked

| # | Decision | Choice | When |
|---|----------|--------|------|
| 1 | Next roadmap track | **B** — shared UI / theme port (not Vue / MinIO / CI-first) | 2026-09-14 |
| 2 | Ownership | **D** — `packages/mfe-ui` = **theme only**; components per-app | 2026-09-14 |
| 3 | Adopters | **B** — shell + demo-react + admin-react; **skip landing** | 2026-09-14 |
| 4 | Landing future | Document **TODO: landing → Next.js** (deferred; not this phase) | 2026-09-14 |
| 5 | Mode | **C** — dual palette + **shell toggle** this phase | 2026-09-14 |
| 6 | Mode sync | **A** — shared `localStorage` key + same-tab `CustomEvent` (+ `storage` cross-tab) | 2026-09-14 |
| 7 | Extra scope | **C** — theme + port **exactly two** demo pages (Home + Status) | 2026-09-14 |
| 8 | Approach | **1** — Theme platform + slim demo showcase; no MF-shared `@mfe/ui` | 2026-09-14 |
| 9 | Package React | `@mfe/ui` is **React-free** (factory + mode I/O only) | 2026-09-14 |
| 10 | Mount contract | **No** `themeMode` on mount ctx | 2026-09-14 |

---

## 3. Evaluated approaches

| Approach | Summary | Effort | Verdict |
|----------|---------|--------|---------|
| **1 (chosen)** | `@mfe/ui` + toggle + mode sync + demo Home/Status | ~10–12h | Selected |
| 2 | Theme + toggle only; demo pages later | ~7–8h | Rejected — user chose demo pages |
| 3 | Approach 1 + `@mfe/ui` in MF `shared` | ~12–14h | Deferred — storage sync enough for v1 |

---

## 4. Architecture & components

### Units

| Unit | Owns | Must not |
|------|------|----------|
| `packages/mfe-ui` | `createTheme(mode)`, theme tokens, `getMode`/`setMode`/`subscribeMode` | React UI, axios, auth, Tailwind |
| `shell` | `ThemeProvider`, AppBar toggle via `setMode` | Import remote internals |
| `demo-react` | Own `ThemeProvider` + `subscribeMode`; Home + Status routes; local Loader/Result if needed | Put components in `@mfe/ui` |
| `admin-react` | Replace default theme with `@mfe/ui` + `subscribeMode` | CRUD redesign this phase |
| `landing` | Unchanged | Import `@mfe/ui` this phase |

### Package layout

```
packages/mfe-ui/
  package.json     # @mfe/ui; exports → ./src/index.ts; peer @mui/material ^6
  src/
    index.ts
    mode.ts        # MODE_KEY, get/set/subscribe
    theme/         # palette, typography, shape, mixins, transitions, components
                   # rewrite from reference MUI theme (host-dashboard/remote-components)
  *.spec.ts
```

- Consume via `file:` (pnpm apps). Docker: COPY + install like `@mfe/sdk`.
- Source: `/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends` theme modules — **adapt**, do not copy Tailwind/shadcn.

### Wiring (separate roots)

```
Shell root                          Remote root (mount)
ThemeProvider(createTheme(mode))    ThemeProvider(createTheme(mode))
AppBar → setMode(...)               subscribeMode → setState(mode)
RemoteOutlet                        Routes under basename=basePath
```

---

## 5. Data flow & interfaces

### Mode sync

1. Shell toggle → `setMode(next)` → `localStorage[MODE_KEY]` + `CustomEvent(MODE_EVENT)`.
2. Same-tab remotes: `subscribeMode` → rebuild theme.
3. Cross-tab: `window` `storage` event for `MODE_KEY`.

### Public API

```ts
export type ThemeMode = 'light' | 'dark';
export const MODE_KEY = 'mfe-ui-mode';           // localStorage
export const MODE_EVENT = 'mfe-ui:mode';         // same-tab CustomEvent; detail = ThemeMode

export function createTheme(mode: ThemeMode): Theme;
export function getMode(): ThemeMode; // default 'light' if missing/invalid
export function setMode(mode: ThemeMode): void;
export function subscribeMode(cb: (mode: ThemeMode) => void): () => void;
```

### Demo routes (`routeName=demo` unchanged)

| URL | Page | Data |
|-----|------|------|
| `/app/demo` | Home | `api.get('/api/v1/users/me')` |
| `/app/demo/status` | Status / Result | static |

- Pass mount `ctx` into demo tree; `basename={ctx.basePath}`; follow admin nested-router pattern.
- Unknown nested paths → in-remote status/NotFound-style page.

### Boundaries

- May import `@mfe/ui`: shell, demo-react, admin-react.
- Must not: tokens in mode storage; `@mfe/ui` → `@mfe/sdk`/axios; landing → `@mfe/ui` this phase; cross-app UI imports.

---

## 6. Error handling & edge cases

| Case | Behavior |
|------|----------|
| Missing/corrupt mode | `getMode()` → `'light'` |
| `localStorage` throws | In-memory mode + still dispatch event; one `console.warn`; no crash |
| Invalid `setMode` | No-op / coerce; never write garbage |
| Subscriber throws | Isolated in `subscribeMode` |
| Demo API errors | In-remote Alert (`ApiError`); SDK handles 401 refresh/redirect |
| Hard refresh `/app/demo/status` | Existing shell splat; verify in e2e |
| FOUC | Accept sync `getMode()` before first paint; no `index.html` script this phase |

Security: mode key stores only `'light' | 'dark'`. Document clearly so it does not weaken “no tokens in localStorage.”

---

## 7. Testing strategy

### Unit (`packages/mfe-ui`)

Vitest: default/invalid `getMode`; set/get round-trip; subscribe/unsubscribe; `createTheme` palette.mode for both modes. Mock `localStorage`.

### App gates

shell / demo-react / admin-react: `typecheck` + `build`. `@mfe/ui`: `test` + `typecheck`.

### Browser

Extend `scripts/e2e-demo-remote.mjs` (or sibling):

1. Login → `/app/demo` mounts; no RUNTIME-008.
2. Toggle → `localStorage['mfe-ui-mode']` flips; no auth tokens in storage.
3. `/app/demo/status` content visible.
4. Hard refresh `/app/demo/status` still remote.
5. Optional: admin picks up same-tab mode change.

Also: `make smoke`; grep no axios outside SDK; grep no `@mfe/ui` from landing; Dockerfiles COPY `@mfe/ui`.

### Out of test scope

Cross-tab (manual OK); landing visuals; Percy/snapshots; full reference pixel parity.

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Docker/`file:` miss for new package | Mirror SDK Dockerfile pattern on day one |
| Theme drift shell vs remotes | Shared `createTheme` + documented subscribe pattern |
| Scope creep into chart Dashboard | Spec locks **Home + Status only** |
| Mode storage confused with token ban | Explicit docs + e2e assert tokens absent |
| Landing Next.js later | Do not invest in landing theme now; roadmap TODO |

### Docs to update when implementing

- `docs/project-roadmap.md` — theme TODO progress; add **Landing → Next.js** deferred item
- `docs/code-standards-frontend.md` — `@mfe/ui` usage + mode-key exception
- `CLAUDE.md` / `docs/codebase-summary.md` — topology `packages/mfe-ui/`
- `packages/mfe-ui/README.md`

### Effort

~10–12h. Suggested plan phases (for `/plan`, not this file):

1. Scaffold `@mfe/ui` + unit tests  
2. Docker/`file:` + shell ThemeProvider + toggle  
3. demo + admin subscribe + ThemeProvider  
4. demo nested Home + Status + pass `ctx`  
5. e2e extend + docs (incl. Next.js landing TODO)

---

## 9. Success metrics

1. Shell toggle flips light/dark in shell **and** mounted remotes without remount.
2. `/app/demo` Home + `/app/demo/status` work; hard refresh on status OK.
3. `@mfe/ui` tests green; shell/demo/admin typecheck + build.
4. Only new storage key related to this feature: `mfe-ui-mode`.
5. Roadmap records theme progress + Landing → Next.js TODO.

---

## 10. Next steps & dependencies

- **Depends on:** Phase C platform; cross-remote splat (for `/app/demo/status` refresh).
- **Does not depend on:** Vue remote, MinIO, CI.
- **Plan created:** [`plans/260914-2316-shared-theme-mfe-ui/`](../../plans/260914-2316-shared-theme-mfe-ui/plan.md) — cook with `/cook --parallel` (or `--auto`).
- **Later (separate brainstorm):** Landing migration to Next.js; optional `@mfe/ui` on new landing; MF-shared `@mfe/ui` if mode drift appears; per-app component catalog ports.

---

**Reference theme source:** `vite-micro-frontends` `remote-components/src/theme/` and `host-dashboard/src/core/theme/` (MUI `createTheme(mode)`).  
**Reference pages (inspiration only):** `remote-components` Home / UnderConstructions / NotFound — not chart Dashboard widgets.
