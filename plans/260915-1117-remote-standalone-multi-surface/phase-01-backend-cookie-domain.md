# Phase 1 — Backend `COOKIE_DOMAIN`

## Context Links

- Spec A §3, §6 — env split + cookie interface
- `backend/src/api/auth/auth.controller.ts` — `refreshCookieOptions()`
- `backend/src/api/auth/config/auth.config.ts` — `registerAs('auth')`
- `backend/.env.example` — auth env today (no domain)
- Scout: cookie has `httpOnly`, `path=/`, `sameSite=lax`, `secure` prod-only; **no `domain`**

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** low–medium (logout clearCookie must match set flags)

Wire optional `COOKIE_DOMAIN` / `AUTH_COOKIE_DOMAIN` into refresh cookie options. Empty → omit `domain` (local host-only). Non-empty → set on login, refresh rotate, and logout clear.

## Requirements

- Config-driven domain; never hardcode `.platform.tld` in controller.
- Local default: unset/empty.
- Unit tests: domain present iff configured; clearCookie uses same domain.
- Document in `.env.example` + short comment (prod vs local).

## Related Code Files

**Modify**
- `backend/src/api/auth/auth.controller.ts`
- `backend/src/api/auth/config/auth.config.ts` (and types if any)
- `backend/.env.example`
- Auth controller unit spec / e2e cookie assertions as needed

**Read**
- `backend/test/auth-scopes.e2e-spec.ts`

## Implementation Steps

1. Add optional config key (prefer `auth.cookieDomain` from `AUTH_COOKIE_DOMAIN` or `COOKIE_DOMAIN` — pick one name and use consistently; recommend **`AUTH_COOKIE_DOMAIN`** to match `AUTH_*` prefix).
2. In `refreshCookieOptions()`: if non-empty string, set `domain: value`.
3. Ensure `clearCookie` spreads same options (already pattern) so Domain clears correctly.
4. Unit-test both branches; smoke e2e still gets HttpOnly `refresh_token` without Domain locally.

## Tests

- Unit: unset → no `domain` in options object; set `.example.com` → `domain` equals value.
- E2E: login still sets HttpOnly cookie (existing).

## Acceptance

- [x] Empty env → cookies work on `localhost` / `:8080` as today
- [x] Set env → Domain attribute present on Set-Cookie (unit or integration)
- [x] Logout clears with matching domain options

## Risks

- Wrong parent domain in prod → silent SSO fail — call out in P7 docs checklist.
