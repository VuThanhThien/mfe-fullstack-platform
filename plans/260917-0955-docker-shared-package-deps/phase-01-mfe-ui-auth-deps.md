# Phase 01 — Lock `@mfe/ui` auth runtime deps

**Priority:** P1  
**Status:** Complete  
**Effort:** 1h  
**Owns:** `packages/mfe-ui/`  
**Blocked by:** —

## Overview

Make `pnpm install --frozen-lockfile --prod` (and npm `--omit=dev`) install the auth/runtime set Docker currently `pnpm add`s, without pulling icons.

## Requirements

1. Add a `dependencies` block to `packages/mfe-ui/package.json` with the Docker auth set (pin majors to match apps today):
   - `react@^18.3.1`, `react-dom@^18.3.1`
   - `@mui/material@^6.5.0`
   - `@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1`
   - `react-hook-form@^7.88.0`, `zod@^4.6.4`, `@hookform/resolvers@^5.9.1`
2. Keep existing `peerDependencies` (consumer contract). Keep `@mui/icons-material` and `recharts` as peers only — **not** in `dependencies`.
3. Remove duplicates from `devDependencies` where the same package is now in `dependencies` (avoid double listing); leave eslint/vitest/testing-library/types as devDeps.
4. Refresh `packages/mfe-ui/pnpm-lock.yaml` via `pnpm install` in that package.
5. Confirm `pnpm install --frozen-lockfile --prod` creates `node_modules` with react + MUI + emotion (no icons required).

## Related files

**Modify**

- `packages/mfe-ui/package.json`
- `packages/mfe-ui/pnpm-lock.yaml`

## Implementation steps

1. [x] Edit `package.json` dependencies / prune overlapping devDeps.
2. [x] `. .dev-bin/env.sh && cd packages/mfe-ui && pnpm install`
3. [x] Smoke: deferred to P2 Docker build (`--prod` UI install).
4. [x] `pnpm typecheck` / `pnpm test` in `packages/mfe-ui` still pass.

## Pseudocode

```json
"dependencies": {
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@mui/material": "^6.5.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "react-hook-form": "^7.88.0",
  "zod": "^4.6.4",
  "@hookform/resolvers": "^5.9.1"
}
```

## Risks

| Risk | Mitigation |
|------|------------|
| Apps already depend on same packages → duplication | Normal for peer+dep pattern; pnpm dedupes at app install |
| Emotion was only in devDeps before | Moving to dependencies matches real MUI runtime need |

## Success criteria

- [ ] `--prod` install of `@mfe/ui` alone has react + MUI + emotion
- [ ] Icons not required for that prod install
- [ ] Package tests/typecheck green
