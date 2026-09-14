# Phase 3 — Admin theme adopt

## Context Links

- Spec §4; plan ownership: `remotes/admin-react/**`
- `remotes/admin-react/src/AdminApp.tsx` — `const theme = createTheme()` from `@mui/material` today
- `remotes/admin-react/Dockerfile` — SDK pattern
- Depends on: Phase 1

## Overview

- **Priority:** P2
- **Status:** pending
- **Effort:** 1h
- **Risk:** low

Replace admin’s default MUI `createTheme()` with `@mfe/ui` + `subscribeMode`. No CRUD page redesign. No compose edit.

## Key Insights

- Admin already has ThemeProvider — swap theme source only.
- Separate React root → must subscribe to mode events; cannot inherit shell context.
- Keep `CssBaseline` inside admin root (remote subtree needs it).

## Requirements

- Admin uses `createTheme` from `@mfe/ui` only (remove MUI `createTheme` import for root theme).
- Mode changes from shell toggle update admin without remount.
- `file:` dep + Dockerfile COPY; typecheck/build green.

## Related Code Files

**Modify**

- `remotes/admin-react/package.json` — `"@mfe/ui": "file:../../packages/mfe-ui"`
- `remotes/admin-react/pnpm-lock.yaml`
- `remotes/admin-react/Dockerfile`
- `remotes/admin-react/src/AdminApp.tsx` — theme + subscribe

**Create (optional)**

- `remotes/admin-react/src/theme/use-theme-mode.ts` (same pattern as shell; duplicate OK per ownership D)

**Must not touch**

- shell, demo-react, mfe-ui src, compose, admin CRUD pages (except if ThemeProvider only)

## Implementation Steps

1. Add `@mfe/ui` file dep (`../../packages/mfe-ui` from remotes/admin-react); `pnpm install`.
2. In `AdminApp.tsx`:
   - Remove `createTheme` from `@mui/material` import.
   - `const [mode, setModeState] = useState(getMode); useEffect(() => subscribeMode(setModeState), []);`
   - `<ThemeProvider theme={createTheme(mode)}>` from `@mfe/ui`.
3. Dockerfile: COPY `packages/mfe-ui` + install like SDK sibling.
4. `pnpm typecheck` && `pnpm build`.

## Todo List

- [ ] file: dep + lockfile
- [ ] AdminApp ThemeProvider + subscribeMode
- [ ] Dockerfile
- [ ] typecheck + build

## Success Criteria

- Admin chrome follows shell toggle same-tab.
- No default empty `createTheme()` left as root theme.
- No product/CRUD behavior changes.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Path depth wrong for file: | Use `../../packages/mfe-ui` (admin is two levels down) |

## Next Phase

P5 verifies admin mode sync in e2e/manual checklist.
