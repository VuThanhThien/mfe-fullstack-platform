# Phase 02 — demo-react consume SDK

**Priority:** P1  
**Status:** Complete  
**Effort:** 0.5h  
**Owns:** `remotes/demo-react/`  
**Blocked by:** P1

## Overview

Delete local SyncedMemoryRouter; import from `@mfe/sdk/react-router`. Behavior unchanged.

## Requirements

1. `ProductApp` / `ArticleApp` use SDK `SyncedMemoryRouter`.
2. Remove `src/routing/SyncedMemoryRouter.tsx` (and empty dir if unused).
3. Ensure `file:` SDK resolution picks up new subpath (reinstall if needed).
4. typecheck + build green.

## Related files

**Modify**

- `remotes/demo-react/src/ProductApp.tsx` (and ArticleApp if separate file)
- `remotes/demo-react/package.json` only if peer/install path needs bump — usually none

**Delete**

- `remotes/demo-react/src/routing/SyncedMemoryRouter.tsx`

**Must not:** change route trees / pages; touch admin or shell.

## Implementation steps

1. [x] Replace import with `@mfe/sdk/react-router`.
2. [x] Delete local router file.
3. [x] `pnpm typecheck` + `pnpm build` in demo-react.
4. [x] Smoke: standalone `basePath="/"` still mounts *(typecheck/build only; no dedicated smoke script run)*.

## Success criteria

- [x] No local SyncedMemoryRouter
- [x] Hosted + standalone product/article still deep-link from window on boot *(code path; not browser smoke in P5 verify)*

## Next

Feeds P5 verify.
