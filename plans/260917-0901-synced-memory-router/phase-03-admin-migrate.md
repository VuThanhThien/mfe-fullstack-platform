# Phase 03 — admin migrate off nested BrowserRouter

**Priority:** P1  
**Status:** Complete  
**Effort:** 1.5h  
**Owns:** `remotes/admin-react/`  
**Blocked by:** P1

## Overview

Replace nested `BrowserRouter basename={basePath}` with `SyncedMemoryRouter basePath={basePath}`. Fixes shell-nav drift while remote stays mounted.

## Requirements

1. `AdminApp.tsx`: wrap existing `Routes` in `SyncedMemoryRouter` from `@mfe/sdk/react-router`.
2. Remove `BrowserRouter` import/usage.
3. Keep relative `Link` / `Navigate` / paths (`users`, `configs/:id/nav`, …).
4. Standalone `main.tsx` `basePath="/"` continues to work (memory ↔ `/...` URLs).
5. SoftGate / theme / NotifyProvider order unchanged (router inside SoftGate is fine).

## Related files

**Modify**

- `remotes/admin-react/src/AdminApp.tsx`
- `remotes/admin-react/src/main.tsx` — comments only if they say BrowserRouter

**Must not:** change page components; SDK impl; shell.

## Implementation steps

1. [x] Swap router wrapper:

```tsx
// before
<BrowserRouter basename={basePath}>
  <Routes>...</Routes>
</BrowserRouter>

// after
<SyncedMemoryRouter basePath={basePath}>
  <Routes>...</Routes>
</SyncedMemoryRouter>
```

2. [x] Verify index redirect `Navigate to="users"` still resolves under memory.
3. [ ] Manual critical path: open `/app/admin/users` → shell nav to configs leaf → **ConfigsList** renders without full remount/refresh *(deferred to e2e; env blocked)*.
4. [ ] Hard refresh deep link `/app/admin/configs/:id/nav` still lands on ConfigNavPage *(deferred to e2e; env blocked)*.
5. [x] `pnpm typecheck` + `pnpm build`.

## Risks

| Risk | Mitigation |
|------|------------|
| Relative links assumed BrowserRouter basename | SyncedMemoryRouter strips base the same way; relative paths unchanged |
| Catch-all `Navigate to="users"` loops | Confirm WindowToMemory lastSynced + same-URL no-op |
| Standalone path `/users` vs hosted `/app/admin/users` | basePath prop already distinguishes |

## Success criteria

- [x] No `BrowserRouter` in admin-react `src/`
- [ ] Shell-driven subpath change updates admin view *(e2e not run — Puppeteer Chrome missing)*
- [ ] Deep link + back button OK hosted *(e2e not run)*

## Next

Feeds P5 verify.
