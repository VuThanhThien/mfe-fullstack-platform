# Phase 05 — Port dashboard UI + theme + `/users/me`

## Context Links

- Spec §5–§6, §7 surface subset
- Research 02 file lists
- Reference: `vite-micro-frontends/remote-vue` (rebuild, not copy federation)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 6h
- **Risk:** high — Tailwind vs MUI; import graph
- **Depends:** P3 complete (same package)
- **Parallel:** ∥ P4 after P3

Replace stub with core dashboard: 4 tabs, memory router, theme bridge, Overview `api.get('/api/v1/users/me')`.

## Requirements

- Root content = `Dashboard` (no `AuthenticatedLayout` / shell-like chrome)
- Router hosted: `createMemoryHistory` via `createAppRouter({ mode: 'embedded' })` (port/adapt reference)
- Tailwind v4 + required UI deps only (chase imports; drop unused ui/*)
- Keep `@unovis` if Analytics needs it; else placeholder
- Theme store: subscribe `mfe-ui-mode` / `mfe-ui:mode` — apply `dark` on mount el; **no** `@mfe/ui` package
- Overview: show `/users/me` email/id; charts/tabs mock via Pinia
- Optional `onNotify` on API error
- Hide Vue DarkModeButton when hosted
- typecheck + build
- No `import axios`

## Related Code Files

**Modify / create under** `remotes/demo-vue/**` only  
**Reference read-only:** `…/vite-micro-frontends/remote-vue/src/**`

**Do not**
- shell, gateway, `@mfe/ui`, backend

## Implementation Steps

1. Add Tailwind + Vue deps to package.json; configure `@tailwindcss/vite`.
2. Port `Dashboard.vue` + tab views + cards + `dashboard.store`.
3. Wire router memory mode in expose `mount`.
4. Implement `theme` bridge module (constants locked to `@mfe/ui` mode.ts).
5. Overview: `api` from `@mfe/sdk` → `/api/v1/users/me`.
6. Visual QA in shell: tabs, theme toggle, no double AppBar.
7. Trim unused `components/ui` to reduce noise.

## Todo

- [x] Tailwind + dashboard tabs
- [x] Memory router embedded
- [x] Theme bridge
- [x] `/users/me` on Overview
- [x] typecheck + build
- [ ] Visual QA vs MUI shell

## Success Criteria

- [x] Four tabs switch without breaking shell URL ownership
- [x] Shell theme toggle flips Vue dark styling
- [x] Overview shows authenticated user fields
- [x] No access/refresh tokens in storage (only `mfe-ui-mode`)

## Risks

| Risk | Mitigation |
|------|------------|
| Tailwind preflight breaks MUI | Scope / reduce preflight; check shell chrome |
| Scope creep full ui catalog | Import-chase only |
| DateRangePicker pulls calendar stack | Stub date range if heavy |

## Security

- SDK only for HTTP; no token logging in Vue UI.

## Next Steps

P6 standalone redirect + docs.
