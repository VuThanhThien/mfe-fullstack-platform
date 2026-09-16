---
title: "Vue Remote D1–D2"
description: "MF-first demo-vue remote + shell Vue outlet; port Tailwind dashboard; theme sync; redirect-only standalone."
status: completed
priority: P1
effort: 15h
branch: master
tags: [feature, frontend, mfe, vue, backend, infra]
created: 2026-09-15
spec: docs/brainstorm/2026-09-15-vue-remote-d1-d2-spec.md
---

# Vue Remote (Phase D1–D2)

**Spec (approved):** [`docs/brainstorm/2026-09-15-vue-remote-d1-d2-spec.md`](../../docs/brainstorm/2026-09-15-vue-remote-d1-d2-spec.md)  
**Scout:** [`reports/scout-report.md`](./reports/scout-report.md)  
**Research:** [`research/researcher-01-vue-mf-mount.md`](./research/researcher-01-vue-mf-mount.md) · [`research/researcher-02-reference-port-subset.md`](./research/researcher-02-reference-port-subset.md)

## Goal

1. Shell mounts `framework: 'vue'` via same `{ mount, unmount }` + `@mfe/sdk` `loadRemote` (no shell `import 'vue'`).
2. `remotes/demo-vue` on `:5177` / `/r/demo-vue*` — Tailwind core dashboard (4 tabs), theme sync `mfe-ui-mode`, Overview `api.get` `/users/me`.
3. Standalone `main.ts` = redirect stub to platform login (no Vue LoginForm).

## Problem (verified)

- `RemoteOutlet` treats non-react as `<Unsupported>` (scout).
- Nav lists all accessibles — seeding vue without shell branch = dead nav click.
- No gateway/compose/smoke for Vue; backend already allows `framework: 'vue'`.
- Reference `remote-vue` is originjs + different theme key — rebuild required.

## Decisions (locked — from spec)

| # | Choice |
|---|--------|
| 1 | MF-first, UI second |
| 2 | Hosted primary + standalone redirect stub |
| 3 | Tailwind core dashboard; no duplicate Layout |
| 4 | Hosted = memory router |
| 5 | Theme: thin bridge mirroring `@mfe/ui` `MODE_KEY`/`MODE_EVENT` — **no** `@mfe/ui` React dep in Vue |
| 6 | Registry: `demoVue` / `./App` / `routeName=vue` / `[DASHBOARD]` / `:5177` |
| 7 | Hybrid data: mock + `/users/me` |
| 8 | Pin `@module-federation/vite@1.16.6` |

## Constraints

1. Access memory-only; refresh HttpOnly; no `?token=`.
2. Mount ctx unchanged (no token).
3. axios only in `@mfe/sdk`.
4. Do not break React remotes / `make smoke` existing checks.
5. Angular out of scope.
6. Do not edit other brainstorm files (except this spec status already set approved).

## Execution strategy (parallel)

```
P1 seed ──┐
P2 gateway ┼──► (integration)
P3 stub ───┘
              ├─► P4 shell VueRemote  ┐
              └─► P5 UI port (demo-vue) ┼─► P6 standalone + docs + verify
```

- **Wave 0 ∥:** P1, P2, P3 (exclusive folders).
- **Wave 1 ∥ after P3:** P4 (shell) ∥ P5 (demo-vue UI) — P5 after P3 same package serialize.
- **Wave 2:** P6 last.

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts` (+ seed tests if any) | FE apps, gateway |
| 2 | `gateway/Caddyfile*`, `gateway/README.md`, `docker-compose.yml`, `Makefile` smoke | remotes src, shell |
| 3 | `remotes/demo-vue/**` stub only (scaffold, expose hello, Dockerfile, Caddyfile.static) | shell, seeder |
| 4 | `shell/src/pages/RemoteOutlet.tsx`, `Unsupported.tsx` comment if needed | remotes, backend |
| 5 | `remotes/demo-vue/**` UI port (replace stub content) | shell, gateway |
| 6 | docs (`CLAUDE.md`, roadmap, codebase-summary, code-standards-frontend, local-dev, demo-vue README), smoke browser notes; demo-vue `main.ts` redirect finalize | feature UI beyond redirect |

> P3 → P5 both own `remotes/demo-vue` — **serialize**.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Seed `vue` MfeConfig | Done | 1h | [phase-01](./phase-01-seed-vue-mfe-config.md) |
| 2 | Gateway + compose + smoke | Done | 1.5h | [phase-02](./phase-02-gateway-compose-smoke.md) |
| 3 | demo-vue MF stub | Done | 3h | [phase-03](./phase-03-demo-vue-mf-stub.md) |
| 4 | Shell VueRemote branch | Done | 2h | [phase-04](./phase-04-shell-vue-outlet.md) |
| 5 | Port dashboard UI + theme + me | Done | 6h | [phase-05](./phase-05-port-dashboard-ui.md) |
| 6 | Standalone redirect + docs + verify | Done | 1.5h | [phase-06](./phase-06-standalone-docs-verify.md) |

## Success (roll-up)

- [x] `dashboard@…` → accessible includes `vue` / `demoVue` (API verified)
- [ ] Browser: nav Vue Dashboard → mount (manual / optional follow-up)
- [ ] Overview shows `/users/me` in UI; theme toggle syncs Vue dark (manual)
- [x] React remotes still registered for same user (accessible: product/article)
- [x] `/r/demo-vue/mf-manifest.json` JSON 200 in `make smoke`
- [ ] Standalone unauth → platform login redirect (manual on `:5177`)

## Out of scope

Angular; Vue SessionGate; URL-deep-link Vue tabs; MinIO; Next landing; `@mfe/ui` in Vue package.
