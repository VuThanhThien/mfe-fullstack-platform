---
title: "Vue SessionGate Dual-Mode"
description: "Replace demo-vue Mode C redirect with local SessionGate + LoginForm mirroring React Spec A."
status: completed
priority: P1
effort: 5h
branch: master
tags: [feature, frontend, mfe, vue, auth]
created: 2026-09-16
spec: docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md
---

# Vue SessionGate Dual-Mode

**Spec (approved):** [`docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md`](../../docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md)  
**Mode:** `--fast` / cooked `--auto`  
**Reference:** `remotes/demo-react/src/main.tsx` · `packages/mfe-ui/src/auth/SessionGate.tsx`

## Goal

1. Standalone `:5177` uses local Vue `SessionGate` + `LoginForm` (no platform login redirect).
2. Hosted `mount` stays ungated; shell Gate owns session.
3. Document URL-synced hosted router as **TODO** only — do not implement.

## Problem

Mode C redirect + host-only cookie = broken standalone DX. React remotes already dual-mode via `@mfe/ui/auth`; Vue cannot import that package.

## Decisions (locked — from spec)

| # | Choice |
|---|--------|
| 1 | SessionGate only; URL sync = TODO |
| 2 | Auth UI local under `remotes/demo-vue/src/auth/` |
| 3 | `ref`/`reactive` + `zod.safeParse`; add `zod@^4.6` |
| 4 | Mirror React `setRedirect` / `safeStandalonePath` |
| 5 | `exposes/app.ts` unchanged (contract) |

## Constraints

1. Access memory-only; refresh HttpOnly; no `?token=`.
2. Hosted expose must not wrap SessionGate.
3. No `@mfe/ui` / no new Vue UI package.
4. axios only in `@mfe/sdk`.
5. Do not change embedded `createMemoryHistory`.

## Execution strategy

```
P1 auth components ──► P2 StandaloneRoot + main.ts ──► P3 docs + verify
```

Sequential — single package ownership (`demo-vue` then docs).

## File ownership

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `remotes/demo-vue/src/auth/**`, `package.json` (zod) | shell, mfe-ui, expose boot logic |
| 2 | `remotes/demo-vue/src/main.ts`, `StandaloneRoot.vue`, `RemoteHost.vue` | hosted router, gateway |
| 3 | docs + README; verify only | product logic beyond Mode C wording |

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Auth components + zod | Done | 2h | [phase-01](./phase-01-auth-components.md) |
| 2 | StandaloneRoot + main.ts | Done | 2h | [phase-02](./phase-02-standalone-entry.md) |
| 3 | Docs + verify | Done | 1h | [phase-03](./phase-03-docs-verify.md) |

## Success (roll-up)

- [x] Unauth `:5177` → local LoginForm (not `:8080/login`) — code path (Mode C redirect removed); browser smoke optional
- [x] Login → dashboard via `mountStandalone` after SessionGate ready — code path
- [x] Hosted `/app/vue` still ungated — `mount` unchanged (code review)
- [x] `typecheck` + `build` green
- [x] Roadmap: SessionGate done; URL-synced router TODO remains

## Out of scope

URL-synced Vue router; `@mfe/ui` Vue auth; Angular; MinIO; CI; register on Vue remote.

## Cook notes

- Code review: 9.5/10 approve (0 critical)
- Tester/project-manager/docs-manager subagents blocked by model usage limit; verification + plan sync done in primary session
