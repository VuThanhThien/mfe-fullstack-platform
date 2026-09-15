# Phase 5 — Landing adopts LoginForm

## Context Links

- Spec A §6.D landing
- `landing/src/pages/Login.tsx`
- `landing/src/schemas/auth.ts`
- P2 `@mfe/ui` LoginForm
- `landing/vite.config.ts` — often behind gateway; add proxy for backend-only DX

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** low

Landing `/login` uses shared `LoginForm`; keep silent `refresh()` → `safeNext(next)` boot. Enable backend-only landing via `/api` proxy when not using gateway.

## Requirements

- Replace inline fields with `@mfe/ui` LoginForm; wire `login()` from SDK.
- Keep register page as-is unless schema sharing is trivial.
- Remove duplicated `loginSchema` from landing if imported from `@mfe/ui`.
- Document: `backend` + `landing` without shell.
- Optional: Vite `/api` proxy for true standalone (recommended).

## Related Code Files

**Modify**
- `landing/src/pages/Login.tsx`
- `landing/src/schemas/auth.ts` (trim or re-export)
- `landing/package.json` — `@mfe/ui` dep if missing
- `landing/vite.config.ts` — proxy
- `landing/README.md` or local-dev (full docs in P7)

## Implementation Steps

1. Depend on `@mfe/ui`; render LoginForm.
2. Preserve checkingSession / refresh-on-mount behavior (can wrap with SessionGate **or** keep existing effect — either OK if UX matches; SessionGate preferred for DRY).
3. Post-login still `safeNext(next)` for shell deep links.
4. Add proxy; verify backend-only login.

## Tests

- Existing manual/e2e login path still works through `:8080`.
- Typecheck landing.

## Acceptance

- [x] Landing uses `@mfe/ui` LoginForm
- [x] Silent refresh still skips form when cookie valid
- [x] Backend + landing only works with proxy

## Risks

- npm (landing) vs pnpm (`@mfe/ui`) — follow existing file: dep pattern used for `@mfe/sdk`.
