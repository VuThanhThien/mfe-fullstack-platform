# Phase 01 — SDK SyncedMemoryRouter + location-sync harden

**Priority:** P1  
**Status:** Complete  
**Effort:** 3h  
**Owns:** `packages/mfe-sdk/`  
**Blocked by:** —

## Overview

Lift `SyncedMemoryRouter` from demo-react into SDK; harden `location-sync`; keep main `@mfe/sdk` entry React-free via subpath export.

## Requirements

1. **Subpath** `@mfe/sdk/react-router` → `SyncedMemoryRouter` (+ re-export sync helpers if useful).
2. **Optional peers:** `react@^18.3`, `react-dom@^18.3`, `react-router-dom@^6`.
3. Move logic from `remotes/demo-react/src/routing/SyncedMemoryRouter.tsx` (behavior-preserving).
4. Unit tests:
   - `location-sync`: same-URL no notify; depth/`runWithoutLocationNotify`; multi-listener; popstate.
   - SyncedMemoryRouter: window→memory + memory→window without storm (jsdom + RTL).
5. Optional pure helpers (no React): `stripBasePath`, `normPath`, `shellPathFromWindow(basename='/app')` for shell P4 — only if reduces dup; else defer.
6. README: document subpath + “do not wrap history yourself”.
7. tsconfig: include `tsx`, `jsx: react-jsx`; vitest: jsdom for `*.spec.tsx` (or dual project).

## Related files

**Create**

- `packages/mfe-sdk/src/react-router/SyncedMemoryRouter.tsx`
- `packages/mfe-sdk/src/react-router/index.ts`
- `packages/mfe-sdk/src/location-sync.spec.ts`
- `packages/mfe-sdk/src/react-router/SyncedMemoryRouter.spec.tsx` (optional if time; location-sync tests are P0)

**Modify**

- `packages/mfe-sdk/package.json` — exports subpath; optional peerDeps; devDeps react/rr/jsdom/types
- `packages/mfe-sdk/tsconfig.json` — jsx + include tsx
- `packages/mfe-sdk/vitest.config.ts` — environment / include
- `packages/mfe-sdk/src/location-sync.ts` — only if helper extract / comment clarity
- `packages/mfe-sdk/README.md` — routing section
- `packages/mfe-sdk/src/index.ts` — keep exporting `subscribeLocationChange` / `runWithoutLocationNotify`; **do not** export SyncedMemoryRouter from main barrel (Vue-safe)

**Must not:** auth/http interceptor changes; share axios to apps.

## Implementation steps

1. [x] Add optional peers + devDeps; wire `exports["./react-router"]`.
2. [x] Port SyncedMemoryRouter (WindowToMemory / MemoryToWindow / stripBase / norm).
3. [x] Harden location-sync comments; add `location-sync.spec.ts` (jsdom or happy-dom for history).
4. [x] Enable tsx in tsconfig; fix typecheck.
5. [x] README: import example:
   ```ts
   import { SyncedMemoryRouter } from '@mfe/sdk/react-router';
   ```
6. [x] `pnpm test` + `pnpm typecheck` in package.

## Pseudocode (export shape)

```ts
// package.json exports
"./react-router": {
  "types": "./src/react-router/index.ts",
  "default": "./src/react-router/index.ts"
}

// SyncedMemoryRouter — same contract as demo-react today
<SyncedMemoryRouter basePath={basePath}>{children}</SyncedMemoryRouter>
```

## Risks

| Risk | Mitigation |
|------|------------|
| Main barrel pulls React | Subpath only; no re-export from `index.ts` |
| Vitest node breaks history tests | jsdom for sync specs |
| Peer version skew vs remotes | Pin peers to remotes’ majors (^18 / ^6) |

## Success criteria

- [x] Import `@mfe/sdk` from Vue still needs no React types resolution for SyncedMemoryRouter
- [x] Import `@mfe/sdk/react-router` works from a React app with peers installed
- [x] location-sync unit tests green; no notify on same-URL replaceState
- [x] Behavior matches current demo-react SyncedMemoryRouter

## Next

Unblocks P2 ∥ P3 ∥ P4.
