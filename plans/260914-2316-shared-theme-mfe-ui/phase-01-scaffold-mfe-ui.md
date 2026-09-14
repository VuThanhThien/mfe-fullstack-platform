# Phase 1 — Scaffold `@mfe/ui`

## Context Links

- Spec: `docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md` §4–§5
- Pattern: `packages/mfe-sdk/package.json`, `vitest.config.ts`, `tsconfig.json`
- Reference theme: `vite-micro-frontends/remote-components/src/theme/` (and host-dashboard duplicate)
- Plan: `plans/260914-2316-shared-theme-mfe-ui/plan.md`

## Overview

- **Priority:** P1 (blocker)
- **Status:** pending
- **Effort:** 3h
- **Risk:** medium — theme port size; icon peer decision

Create `packages/mfe-ui`: React-free theme factory + mode helpers. Vitest green before any app wires it.

## Key Insights

- Mirror SDK: `exports` → `./src/index.ts`, no build step, `file:` consumers.
- Reference `components.tsx` imports `@mui/icons-material` — either add as **peerDependency** (apps already have it) or strip icon-dependent overrides. **Prefer peers:** `@mui/material` + `@mui/icons-material`.
- Package must not depend on axios or `@mfe/sdk`.
- `localStorage` may throw — mode helpers must degrade to memory + event.

## Requirements

- Public API: `ThemeMode`, `MODE_KEY`, `MODE_EVENT`, `createTheme`, `getMode`, `setMode`, `subscribeMode`.
- `createTheme('light'|'dark')` returns MUI `Theme` with `palette.mode` matching.
- Unit tests cover mode + theme smoke.
- Package README documents: theme-only scope; mode key ≠ tokens.

## Related Code Files

**Create**

- `packages/mfe-ui/package.json`
- `packages/mfe-ui/tsconfig.json`
- `packages/mfe-ui/vitest.config.ts`
- `packages/mfe-ui/pnpm-lock.yaml` (via install)
- `packages/mfe-ui/README.md`
- `packages/mfe-ui/src/index.ts`
- `packages/mfe-ui/src/mode.ts`
- `packages/mfe-ui/src/mode.spec.ts`
- `packages/mfe-ui/src/theme/index.ts`
- `packages/mfe-ui/src/theme/palette.ts`
- `packages/mfe-ui/src/theme/typography.ts`
- `packages/mfe-ui/src/theme/shape.ts`
- `packages/mfe-ui/src/theme/mixins.ts`
- `packages/mfe-ui/src/theme/transitions.ts`
- `packages/mfe-ui/src/theme/components.tsx` (or `.ts` if no JSX — prefer `.ts` returning plain objects; icons import OK in `.ts`)
- `packages/mfe-ui/src/theme/create-theme.spec.ts`

**Modify:** none outside `packages/mfe-ui/`

## Implementation Steps

1. Scaffold `package.json`:
   - `name`: `@mfe/ui`, `version`: `0.1.0`, `type`: `module`
   - `exports` / `main` / `types` → `./src/index.ts`
   - `peerDependencies`: `@mui/material` `^6`, `@mui/icons-material` `^6` (if keeping icon overrides)
   - `devDependencies`: typescript, vitest, `@types/node`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` (for tests)
   - scripts: `test`, `test:watch`, `typecheck`
2. Copy SDK-like `tsconfig.json` + `vitest.config.ts` (include `src/**/*.ts`; if components use JSX, allow `tsx` or keep overrides icon-free in `.ts`).
3. Implement `mode.ts`:
   - `MODE_KEY = 'mfe-ui-mode'`, `MODE_EVENT = 'mfe-ui:mode'`
   - `getMode()`: read LS; invalid/missing → `'light'`; catch → memory fallback
   - `setMode(mode)`: write LS (catch → memory); `dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }))`
   - `subscribeMode(cb)`: listen `MODE_EVENT` + `storage` (filter key); return unsubscribe; wrap cb in try/catch
4. Port theme modules from reference — **adapt** (paths, imports); drop nprogress-only noise if unused; keep light/dark palettes.
5. `createTheme(mode)` in `theme/index.ts` — same two-pass pattern as reference (base then components).
6. Export all from `src/index.ts`.
7. Write vitest: get/set/subscribe; createTheme modes.
8. `pnpm install` in package; `pnpm test` + `pnpm typecheck` green.
9. Write short README (API + “not for tokens” + “no React components”).

## Todo List

- [ ] Scaffold package.json / tsconfig / vitest
- [ ] Implement mode.ts + tests
- [ ] Port theme modules + createTheme
- [ ] createTheme tests
- [ ] README
- [ ] `pnpm test` + `typecheck` green

## Success Criteria

- `@mfe/ui` tests pass; typecheck clean.
- No React runtime dependency required to import `createTheme` / mode helpers (peers only for MUI).
- API matches spec constants exactly (`MODE_KEY`, `MODE_EVENT`).

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Large components.tsx / icon coupling | Peer icons or strip; do not pull whole reference UI |
| Accidental React components in package | Code review: exports are theme + mode only |
| Vitest localStorage | Use mock / happy-dom / vitest stub |

## Next Phase

P2 / P3 / P4 may start in parallel once this package is installable (`file:` path resolves).
