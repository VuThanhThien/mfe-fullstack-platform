# Phase 2 — Shell theme + toggle

## Context Links

- Spec §4–§5; plan ownership: `shell/**` only
- `shell/src/layout/ShellLayout.tsx` — AppBar + CssBaseline today
- `shell/src/App.tsx` — root CssBaseline (may move under ThemeProvider)
- `shell/src/main.tsx` — entry
- `shell/Dockerfile` — SDK COPY/install pattern
- Depends on: Phase 1 `@mfe/ui`

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Risk:** low–medium (Docker/`file:`)

Wire `@mfe/ui` into shell: ThemeProvider, sync `getMode`/`subscribeMode`, AppBar light/dark toggle via `setMode`. Update shell `package.json` + Dockerfile. **Do not** edit `docker-compose.yml` (P5 owns).

## Key Insights

- Shell currently has CssBaseline in `App.tsx` without ThemeProvider — wrap at App or ShellLayout level. Prefer **one** ThemeProvider high in tree (e.g. wrap inside `Gate` children or entire `App` under provider) so layout + outlet share theme.
- Toggle only calls `setMode` — remotes subscribe independently.
- `file:../packages/mfe-ui` from `shell/` (same relative depth as sdk).

## Requirements

- Shell renders with `@mfe/ui` `createTheme(getMode())`.
- AppBar control toggles light ↔ dark; persists via `setMode`.
- Dockerfile installs `@mfe/ui` like SDK (COPY + `pnpm install` in package dir). Note: `@mfe/ui` has **peers**, not runtime deps like axios — install may be `--prod` no-op for deps; still COPY package so Vite resolves sources. Install peer-providing packages already on shell.
- `pnpm typecheck` + `build` green for shell.

## Related Code Files

**Modify**

- `shell/package.json` — add `"@mfe/ui": "file:../packages/mfe-ui"`
- `shell/pnpm-lock.yaml` — refresh via `pnpm install`
- `shell/Dockerfile` — COPY `packages/mfe-ui`; install if package has deps; comment peers
- `shell/src/App.tsx` and/or `shell/src/layout/ShellLayout.tsx` — ThemeProvider + toggle
- Optional: `shell/src/theme/use-theme-mode.ts` — thin hook wrapping get/subscribe (app-local, not in `@mfe/ui`)

**Create (optional)**

- `shell/src/theme/use-theme-mode.ts`

**Must not touch**

- remotes, `packages/mfe-ui/src`, `docker-compose.yml`, landing

## Implementation Steps

1. Add `@mfe/ui` file dep; `pnpm install` in `shell/`.
2. Add `useThemeMode` helper (or inline): `useState(getMode)` + `useEffect(() => subscribeMode(setMode), [])`.
3. Wrap app tree:
   ```tsx
   const mode = /* from hook */;
   <ThemeProvider theme={createTheme(mode)}>
     <CssBaseline />
     ...
   </ThemeProvider>
   ```
   Remove duplicate CssBaseline if both App and layout had it — keep one.
4. AppBar: IconButton (Brightness4 / Brightness7) → `setMode(mode === 'light' ? 'dark' : 'light')`.
   Add `data-testid="theme-mode-toggle"` + `aria-label` for P5 e2e.
5. Dockerfile:
   ```dockerfile
   COPY packages/mfe-ui /workspace/packages/mfe-ui
   RUN cd /workspace/packages/mfe-ui && pnpm install --frozen-lockfile --prod || true
   ```
   Prefer real lockfile install like SDK; if package has no prod deps, `pnpm install --frozen-lockfile` still OK for linking. Match SDK style closely.
6. `pnpm typecheck` && `pnpm build` in shell.

## Todo List

- [ ] file: dep + lockfile
- [ ] ThemeProvider + subscribeMode
- [ ] AppBar toggle → setMode
- [ ] Dockerfile COPY mfe-ui
- [ ] typecheck + build green

## Success Criteria

- Toggle updates shell palette immediately.
- `localStorage['mfe-ui-mode']` flips.
- No auth tokens written to storage by this change.
- Shell Docker build context includes `packages/mfe-ui`.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Double CssBaseline / theme flash | Single provider; sync getMode on first render |
| Dockerfile peer install confusion | Peers satisfied by shell's existing MUI deps |

## Next Phase

P3/P4 independent. P5 adds compose volume for hot reload.
