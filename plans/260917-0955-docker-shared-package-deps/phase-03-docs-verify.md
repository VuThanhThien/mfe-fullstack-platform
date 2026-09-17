# Phase 03 — Docs + verify

**Priority:** P2  
**Status:** Complete  
**Effort:** 1h  
**Owns:** `docs/deployment-guide.md` (+ brief note in package READMEs if needed)  
**Blocked by:** Phase 02

## Overview

Document the lockfile-driven install rules; prove the stack builds.

## Requirements

1. Update `docs/deployment-guide.md` § Docker SDK/UI install table:
   - Remove “pnpm add peers” narrative
   - Document `@mfe/ui` `dependencies` = auth runtime for `--prod`
   - Document React remotes = full SDK install for SyncedMemoryRouter path-maps
   - Vue = SDK `--prod` only
2. Optional one-liner in `packages/mfe-ui/README.md` if it documents peers for Docker.
3. Verify:
   - `make up`
   - `make smoke`
4. Optional hygiene (only if quick): add `.pnpm-store` / host cache dirs to root `.dockerignore` if missing and clearly bloating context — do not expand scope.

## Implementation steps

1. [ ] Edit deployment-guide.
2. [ ] `make up` → success.
3. [ ] `make smoke` → gateway 200s.
4. [ ] Mark plan phases complete in `plan.md`.

## Success criteria

- [ ] Docs match Dockerfiles
- [ ] Stack up + smoke green
