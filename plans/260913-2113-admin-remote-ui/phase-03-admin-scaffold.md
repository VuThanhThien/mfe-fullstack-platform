# Phase 03 — Admin scaffold + SoftGate + router

**Effort:** 2h · **Owns:** `remotes/admin-react/**` · **Depends on:** P1+P2 for E2E; can scaffold offline

## Context Links

- Spec §4–§5
- Mirror: `remotes/demo-react/`
- Shell mount ctx: `shell/src/pages/RemoteOutlet.tsx`

## Overview

Vite MF remote `adminReact` exposing `./App` → `{ mount, unmount }`. SoftGate + nested `react-router-dom` with `basename=ctx.basePath`.

## Implementation Steps

1. Scaffold package from demo-react (copy structure; rename).
   - `"@mfe/sdk": "file:../../packages/mfe-sdk"`
   - `base: '/r/admin-react/'`, `server.port: 5176`, `origin: http://localhost:8080`
   - federation `name: 'adminReact'`, `exposes: { './App': './src/expose.tsx' }`, `manifest: true`
   - shared singletons: react, react-dom, `@mfe/sdk`, MUI/emotion (match demo)
2. `expose.tsx`:
   ```ts
   mount(el, ctx) {
     root = createRoot(el);
     root.render(<AdminApp basePath={ctx.basePath} routeName={ctx.routeName} />);
   }
   ```
3. `jwt-scopes.ts`: decode payload (no signature verify); return `scopes[]` or `[]`.
4. `SoftGate`: if `!scopes.includes('ADMIN')` → Forbidden MUI page; else children.
5. `AdminApp`: MUI ThemeProvider; `BrowserRouter basename={basePath}`; routes stub pages (`Users`, `Scopes`, `Configs` placeholders); `/` → Navigate to `users`.
6. Top nav **inside remote**: Links to `users` | `scopes` | `configs` (relative).
7. Standalone `main.tsx` optional for isolated preview only.

## Todo List

- [x] Package + vite federation
- [x] mount/unmount with ctx
- [x] SoftGate + Forbidden
- [x] Nested router + placeholder pages
- [x] Load via shell when seed+gateway+vite up

## Success Criteria

- Admin login → Admin nav → outlet renders remote chrome
- Non-admin SoftGate shows Forbidden (unit or force token)
- Unmount cleans root

## Risk

| Risk | Mitigation |
|------|------------|
| basename mismatch | Must equal `/app/admin` from shell |
| Shared scope dup React | Pin 18.3 + singleton |

## Next

P4 Users CRUD.
