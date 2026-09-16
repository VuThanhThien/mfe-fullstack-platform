# Code Review — Vue Remote D1–D2

**Date:** 2026-09-15  
**Reviewer:** code-reviewer agent  
**Spec:** `docs/brainstorm/2026-09-15-vue-remote-d1-d2-spec.md`  
**Plan:** `plans/260915-2252-vue-remote-d1-d2/`  
**Score:** **7.5 / 10**  
**Verdict:** **Request changes**

---

## Scope

| Area | Files |
|------|--------|
| New remote | `remotes/demo-vue/**` (~13 source files under `src/`) |
| Shell | `RemoteOutlet.tsx`, `Unsupported.tsx` |
| Seed | `backend/.../1722335727000-mfe-config-seeder.ts` |
| Infra | `gateway/Caddyfile*`, `docker-compose.yml`, `Makefile` |
| Docs (skim) | `CLAUDE.md`, roadmap, codebase-summary, local-dev; **code-standards-frontend** checked for P6 |

**LOC (approx):** demo-vue `src/` + vite/package ~750; shell outlet delta small (~net −12 lines via FederatedRemote merge).

**Focus:** Locked guarantees + scout edge cases (not full browser E2E — plan notes verify pending).

---

## Scout findings (edge cases)

| Finding | Risk | Notes |
|---------|------|--------|
| Tailwind `@import 'tailwindcss'` injected from expose CSS | Medium (known) | Preflight can affect host MUI; spec §6 accepts; root scoped via `[data-demo-vue]` + custom `dark` variant — mitigation partial only |
| `onNotify` passed by shell, dropped in Vue `boot()` | Low–Med | Overview cannot Snackbar on `/users/me` failure; spec marks optional |
| `locale` / `basePath` props unused in `App.vue` | Low | Memory router correct; locale not applied to `lang` |
| Overview `api.get` without abort on unmount | Low | Tab leave mid-request → setState on unmounted panel |
| Package-level `.gitignore` missing | Low | Root `.gitignore` already has `node_modules/` + `dist/` — still inconsistent vs demo-react/admin-react |
| Dead dep `@vueuse/core` | Low | Declared, never imported under `src/` |
| `code-standards-frontend.md` still documents Vue → Unsupported | **Major** | Agents/docs lie about outlet guard; P6 required update |
| Browser / `make smoke` not evidenced in this review | Process | Plan marks P6 Done* with verify pending — do not claim §9 green yet |
| Shared `vue` only on remote (shell does not share Vue) | Accepted | Spec wave-1; works as remote-provided singleton |

**Verified OK:** no shell `import 'vue'`; no axios / `@mfe/ui` in demo-vue; theme keys match `@mfe/ui`; hosted `createMemoryHistory`; MF pin `1.16.6`; seed `routeName=vue` / `demoVue` / `./App` / `[DASHBOARD]`; gateway + compose + smoke curl for manifest; `vue-tsc` + shell `tsc --noEmit` exit 0.

---

## Locked guarantees checklist

| Guarantee | Status |
|-----------|--------|
| `{ mount, unmount }` only; mount ctx no token | **Pass** — `exposes/app.ts`; shell passes `{ basePath, routeName, locale, onNotify }` only |
| axios only in `@mfe/sdk` | **Pass** — Overview uses `api.get`; no axios dep in remote `package.json` |
| no `@mfe/ui` React dep in Vue remote | **Pass** — thin `theme/mode.ts` mirror |
| theme `mfe-ui-mode` / `mfe-ui:mode` | **Pass** — constants + CustomEvent + `storage` match `packages/mfe-ui/src/mode.ts` |
| hosted memory router | **Pass** — `createAppRouter('embedded')` → `createMemoryHistory()` |
| pin `@module-federation/vite` 1.16.6 | **Pass** — exact pin in `package.json` |
| shell does not import Vue | **Pass** — framework-agnostic `FederatedRemote` + `loadRemote` |

---

## Overall assessment

Implementation matches the approved MF-first design: seed + gateway + shared shell mount path + Vue dashboard with SDK `/users/me` proof and theme bridge. Architecture choices (FederatedRemote merge, no shell Vue runtime, redirect-only standalone) are sound.

Blocking concern is **documentation authority drift**: frontend code standards still teach the pre-D1 outlet guard. Combined with unused dependency and incomplete P6 verification, this is not merge-clean as “shipped.”

No critical security or contract violations found in the focus code.

---

## Critical issues

_None._

---

## High / major issues

### M1 — `docs/code-standards-frontend.md` contradicts running shell (P6 incomplete)

**Evidence:** § Remote mount lifecycle still says `item.framework !== 'react'` → `<Unsupported>` (no `loadRemote`). Authority blurb omits `demo-vue`. Tree comment still “React remote” only.

**Impact:** Agents and humans following code-standards will mis-implement or “fix” Vue support. Violates plan phase-06 docs requirement and CLAUDE doc-authority rules (running code wins — docs must catch up).

**Fix:** Update outlet decision tree to `react | vue` → FederatedRemote; document Vue remote constraints (memory router, no `@mfe/ui`, theme bridge keys, `:5177` / `demoVue`). Optionally add a short note in `system-architecture.md` if a remotes section exists.

### M2 — Plan success / “shipped” claimed ahead of verification gate

**Evidence:** Plan P6 `Done*` + roadmap/CLAUDE mark D1–D2 complete; phase-06 todos still unchecked; no smoke/browser evidence in this review.

**Impact:** False completion signal. Spec §9 checklist still unchecked in brainstorm.

**Fix:** Run `make smoke` (manifest JSON), browser matrix (nav mount, `/users/me`, theme, React coexistence, no auth tokens in storage), then flip plan status / checkboxes.

---

## Medium / minor issues

### m1 — Unused `@vueuse/core` dependency

Declared in `package.json`, zero imports in `src/`. Inflates lockfile/install without benefit. Remove or use.

### m2 — `onNotify` not provided into Vue app

Shell passes `onNotify`; `boot()` never `provide`s it; Overview only shows inline error. Spec allows optional — but dead wiring is confusing. Either `app.provide('onNotify', ctx.onNotify)` + use on Overview failure, or stop accepting unused ctx fields in comments.

### m3 — Missing package `.gitignore`

Sibling remotes ship `node_modules` / `dist` / `.env` ignores. Root covers the first two; add local `.gitignore` for consistency and `.env` / `*.local`.

### m4 — Dead / unused surface in UI boot

- `App.vue` defines `basePath` / `locale` unused  
- `DashboardView` empty `onMounted`  
- CSS leak risk remains (documented) — keep visual check on shell Product + Vue side-by-side

### m5 — Overview fetch race on tab switch

No abort/cancel on unmount when leaving Overview during `api.get`. Prefer `AbortController` or ignore-if-stale flag.

---

## Positive observations

- **FederatedRemote** correctly unifies React/Vue lifecycle without importing Vue — cleaner than a duplicate `VueRemote` clone.
- **Theme bridge** is the right isolation: lockstep keys with `@mfe/ui`, no React peers.
- **Expose hygiene:** module-level single root; `boot` → `unmount()` first; theme unbind on teardown.
- **Registry/infra** aligned: seed, all three Caddyfile variants, compose service + gateway depends_on, Makefile JSON Content-Type check.
- **Standalone Mode C** correctly uses `setRedirectPolicy('standalone')` + `sanitizeNextForPolicy` + platform login redirect.
- Typecheck green: `remotes/demo-vue` `vue-tsc` and `shell` `tsc --noEmit`.

---

## Recommended actions (priority)

1. **Update `docs/code-standards-frontend.md`** (and skim `system-architecture.md`) so Vue outlet behavior matches code.  
2. **Run verification gate** (`make smoke` + browser §9); only then mark plan completed.  
3. **Remove `@vueuse/core`** (or wire it intentionally).  
4. **Add `remotes/demo-vue/.gitignore`** mirroring demo-react.  
5. **Optional:** provide `onNotify` + abortable `/users/me`.

---

## Metrics

| Metric | Result |
|--------|--------|
| demo-vue typecheck | Pass (`vue-tsc --noEmit`) |
| shell typecheck | Pass (`tsc --noEmit`) |
| Guarantee checklist | 7/7 Pass |
| Critical findings | 0 |
| Major findings | 2 |
| Minor findings | 5 |
| Browser / smoke in this review | Not run |
| Test coverage (demo-vue) | None (spec: out of scope beyond typecheck/build) |

---

## Unresolved questions

- Has `make seed` been applied against a live DB so `routeName=vue` exists for manual QA?  
- After compose build, does Tailwind preflight visibly regress MUI shell chrome? (manual)  
- Should P6 also bump SDK test count mentions in CLAUDE/docs if already drifted (44 vs 51)? Out of Vue scope but noticed in standards copy.

---

## Verdict

**Request changes** — ship-quality for the **runtime contract and infra**, not yet for **doc authority + verify gate + dep hygiene**.

Re-review after M1–M2 (and ideally m1–m3). Expected post-fix score ≥ **8.5 / 10** → Approve.
