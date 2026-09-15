# Phase 2 — `@mfe/ui` LoginForm + SessionGate

## Context Links

- Spec A §5–§7 — components, interfaces, errors
- `landing/src/pages/Login.tsx` — UX reference (do not delete yet; P5 switches)
- `landing/src/schemas/auth.ts` — `loginSchema`
- `packages/mfe-ui/src/index.ts` — barrel (no auth today)
- `packages/mfe-ui/README.md` — currently says no auth

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 2.5h
- **Risk:** medium — keep package free of axios / token storage

Extract presentational login + optional SessionGate helper into `@mfe/ui`. Apps pass `onSubmit` / `bootstrap` that call `@mfe/sdk`.

## Requirements

- `LoginForm`: RHF + zod + MUI Controller pattern (landing parity); props `onSubmit`, `error?`, optional footer slot.
- Export `loginSchema` + types from `@mfe/ui` (or `LoginForm` colocated schema) so landing/remotes do not drift.
- `SessionGate`: `bootstrap()`, `renderLogin`, `children`; on network fail show banner + login per Spec A §7.
- **No** `import axios`, no token in `localStorage`, no Nest URLs inside `@mfe/ui`.
- Update README: auth **UI** allowed; HTTP stays in SDK.

## Related Code Files

**Create**
- `packages/mfe-ui/src/auth/LoginForm.tsx` (path flexible)
- `packages/mfe-ui/src/auth/SessionGate.tsx`
- `packages/mfe-ui/src/auth/loginSchema.ts`
- Unit tests under `packages/mfe-ui`

**Modify**
- `packages/mfe-ui/src/index.ts`
- `packages/mfe-ui/package.json` — peers: `react-hook-form`, `zod`, `@hookform/resolvers` if not already
- `packages/mfe-ui/README.md`

## Implementation Steps

1. Port login schema + form UI from landing (trim register-only bits).
2. SessionGate states: checking → children | login | login+unreachable banner.
3. Export from barrel; add Vitest coverage for submit/error/bootstrap branches.
4. Guarantee no axios via lint or test import scan if practical.

## Tests

- LoginForm: validation errors; `onSubmit` called with values; displays `error`.
- SessionGate: bootstrap resolve → children; reject → renderLogin; status-0 style → banner path (simulate via bootstrap throw shape agreed with apps).

## Acceptance

- [x] `@mfe/ui` exports LoginForm + SessionGate + schema
- [x] Package still has no axios dependency / imports
- [x] README updated
- [x] Unit tests green

## Risks

- Peer version skew with landing/shell — align versions to existing frontend pins.
