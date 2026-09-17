# Phase 02 — SDK types

**Priority:** P1  
**Status:** Complete  
**Effort:** 2h  
**Owns:** `packages/mfe-sdk/`  
**Blocked by:** P1 (contract frozen; can stub types from spec in parallel once P1 route path locked)

## Overview

Extend public types for `iconUrl` + nav tree; optional thin helpers; tests if helpers added.

## Requirements

- `MfeAccessibleItem.iconUrl?: string`
- `MfeNavNode` type: `{ id, type, title, path?, iconUrl?, children: MfeNavNode[] }`
- Document endpoint path in README: `GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible`
- Optional: `fetchAccessibleNav(routeName)` wrapper using `api.get` — **nice-to-have**; shell may call `api.get` raw (match Gate style)

## Related files

**Modify**

- `packages/mfe-sdk/src/types.ts`
- `packages/mfe-sdk/src/index.ts` exports
- `packages/mfe-sdk/README.md`
- tests only if new functions

**Must not:** change auth/http interceptors; share axios to apps.

## Implementation steps

1. Add types matching backend res DTOs.
2. Export from index.
3. README snippet for launcher + nav fetch.
4. `pnpm test` + `typecheck` in package.

## Todo

- [x] Types + exports
- [x] README
- [x] Tests green (51+ or unchanged count if types-only)

## Success criteria

Shell/admin can import types without local duplication (admin may still keep local DTO mirrors — prefer shared types where easy).

## Next

## Implementation status

Shipped 2026-09-16. `MfeAccessibleItem.iconUrl?` + `MfeNavNode` exported; SDK README documents lazy `GET .../by-route/:routeName/nav/accessible`. No `fetchAccessibleNav` wrapper (optional; shell uses `api.get`).

## Next

Unblocks P3.
