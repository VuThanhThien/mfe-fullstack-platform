# Phase 01 — Auth components + zod

**Status:** Done  
**Effort:** 2h  
**Priority:** P1  
**Spec:** `docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md` §4–§5  
**Refs:** `packages/mfe-ui/src/auth/SessionGate.tsx`, `LoginForm.tsx`, `loginSchema.ts`; `remotes/demo-react/src/main.tsx` (`resolveLoginError`)

## Goal

Ship presentational Vue auth kit under `remotes/demo-vue/src/auth/` with zod schema mirroring `@mfe/ui/auth`. No wiring into `main.ts` yet (that is P2).

## Requirements

- Add runtime dep `zod@^4.6.4` (align demo-react/landing).
- `loginSchema.ts` — same rules as `@mfe/ui`: `z.email` + `password` min 1; export `LoginFormValues`.
- `resolveLoginError.ts` — map `ApiError` like demo-react (401/422, 429, 0, else).
- `SessionGate.vue` — FSM `checking | ready | login(unreachable)`; props `bootstrap`; slots `login` + default; `status === 0` → unreachable; bootstrap via ref so inline lambdas do not loop.
- `LoginForm.vue` — Tailwind; props `onSubmit`, `error?`, `disabled?`, `title?`; `safeParse` on submit; **no** `@mfe/sdk` imports.

## Files

| Action | Path |
|--------|------|
| Modify | `remotes/demo-vue/package.json` (+ lockfile via `pnpm install`) |
| Create | `remotes/demo-vue/src/auth/loginSchema.ts` |
| Create | `remotes/demo-vue/src/auth/resolveLoginError.ts` |
| Create | `remotes/demo-vue/src/auth/SessionGate.vue` |
| Create | `remotes/demo-vue/src/auth/LoginForm.vue` |

**Must not touch:** `main.ts`, `exposes/app.ts`, shell, `@mfe/ui`

## Steps

1. `pnpm add zod@^4.6.4` in `remotes/demo-vue` (after `. ../../.dev-bin/env.sh`).
2. Add schema + resolveLoginError (import `ApiError` type/value from `@mfe/sdk` only in resolve helper).
3. Implement SessionGate FSM matching React semantics (`checking` → null).
4. Implement LoginForm with field + form-level errors.
5. `pnpm typecheck` — components may be unused until P2; ensure they typecheck if imported from a barrel or leave for P2 import (prefer export from files; P2 imports them).

## Acceptance

- [x] `zod` in dependencies
- [x] Schema rules match `@mfe/ui/auth` loginSchema
- [x] SessionGate exposes unreachable + retry to login slot
- [x] LoginForm has zero sdk auth calls
- [x] `pnpm typecheck` green


## Risks

- Vue slot typing for `login` ctx — use typed `defineSlots` or plain props callback if slots painful; prefer slots for React parity.
