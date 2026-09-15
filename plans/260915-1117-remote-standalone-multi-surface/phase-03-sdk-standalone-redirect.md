# Phase 3 — SDK standalone redirect

## Context Links

- Spec A §6 — SDK redirect note
- `packages/mfe-sdk/src/next.ts` — `safeNext` → `^/app(/.*)?$` only
- `packages/mfe-sdk/src/http.ts` — `redirectToLogin()` → `/login?next=`
- `packages/mfe-sdk/src/next.spec.ts`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** high if shell path regresses

Shell must keep current `safeNext` semantics. Standalone remotes need same-origin `/login` (or app login path) after 401 refresh failure — without open redirects.

## Requirements

- Keep `safeNext` behavior for shell/landing `?next=` to `/app…`.
- Add explicit helper **or** parameterized API, e.g.:
  - `safeNext(value)` — unchanged
  - `safeStandalonePath(value)` — allow only same-origin relative paths starting with `/`, reject `//`, `http:`, etc.; default `/login` or `/`
  - and/or `setRedirect` / mode so `http.ts` `redirectToLogin` uses standalone policy when configured by standalone `main.tsx`
- Document: hosted shell does **not** call standalone mode.
- No absolute external URLs in allowlist for local; prod parent-domain absolute allowlist **optional** this phase (Spec A mentions it — implement minimal same-origin first; note prod subdomain follow-up in P7 if deferred).

## Architecture

```
standalone main.tsx
  setRedirectPolicy('standalone')  // or setRedirect(fn)
http 401 after refresh fail
  → /login?next=<sanitized same-origin path>
shell / landing
  → unchanged safeNext → /login?next=/app/...
```

Prefer smallest API: `setRedirect` already exists — standalone registers custom redirect; export `sanitizeNextPath` for LoginForm post-login assign.

## Related Code Files

**Modify**
- `packages/mfe-sdk/src/next.ts` (+ new helpers)
- `packages/mfe-sdk/src/http.ts` (if policy needed)
- `packages/mfe-sdk/src/index.ts`
- `packages/mfe-sdk/src/next.spec.ts` (+ http redirect tests if any)
- `packages/mfe-sdk/README.md`

## Implementation Steps

1. Add sanitizer for standalone relative paths.
2. Wire how standalone apps register redirect (document in README; P4 calls it).
3. Regression: existing `safeNext` tests unchanged pass.
4. New tests: reject `https://evil`, `//evil`, allow `/login`, `/products`.

## Tests

- Full `next.spec.ts` matrix for new helper.
- Confirm default shell redirect path still `/login?next=/app…` when policy unset.

## Acceptance

- [x] Shell `safeNext` unchanged
- [x] Standalone can land on same-origin `/login` after 401
- [x] Open redirect still blocked
- [x] README documents API

## Risks

- Forgetting `setRedirect` in standalone → bounce to wrong host — P4 acceptance must call helper at boot.
