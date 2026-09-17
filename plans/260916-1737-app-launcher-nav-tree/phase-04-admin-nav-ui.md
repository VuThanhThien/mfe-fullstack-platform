# Phase 04 — Admin nav CRUD UI

**Priority:** P1  
**Status:** Complete  
**Effort:** 6h  
**Owns:** `remotes/admin-react/`  
**Blocked by:** P1

## Overview

Admin UI to manage per-config nav trees: nested editor, scopes, icon URLs; `iconUrl` on config forms.

## Requirements

- Config create/edit: optional `iconUrl` (https zod).
- Nav editor route e.g. `configs/:id/nav` — tree list, add child, edit dialog, delete confirm, move up/down (reorder API or patch sortOrder).
- Fields: type, title, path (route only), iconUrl, scopeNames, parent.
- SoftGate / ADMIN unchanged.
- Use `api.*` only.

## Related files

**Create**

- `remotes/admin-react/src/pages/configs/ConfigNavPage.tsx`
- `remotes/admin-react/src/components/nav/NavTreeEditor.tsx` (optional split)
- `remotes/admin-react/src/lib/api/nav-items.ts`
- `remotes/admin-react/src/schemas/nav-item.ts`

**Modify**

- `AdminApp.tsx` — route `configs/:id/nav`
- `AdminNav.tsx` — optional link; or button from ConfigEditPage
- `ConfigCreatePage.tsx` / `ConfigEditPage.tsx` / schemas / types — `iconUrl`
- `ConfigsListPage.tsx` — link “Nav” per row

**Must not:** shell layout; backend; second shell chrome inside admin beyond existing Page patterns.

## Implementation steps

1. API client wrappers matching P1 endpoints.
2. Zod schemas aligned with backend.
3. ConfigNavPage: load tree/flat, recursive render, forms.
4. Wire navigation from config edit/list.
5. typecheck + build admin-react.

## Todo

- [x] iconUrl on config forms
- [x] nav-items API module
- [x] ConfigNavPage + editor UX
- [x] Routes + list links
- [x] typecheck/build

## Success criteria

ADMIN can build nested menu for `product`; dashboard user sees subset after scope assign.

## Risks

| Risk | Mitigation |
|------|------------|
| Drag-drop time sink | Up/down only v1 |
| Flat vs tree load | Prefer GET admin tree or build client-side from flat sorted list |

## Next

## Implementation status

Shipped 2026-09-16. Config `iconUrl` on create/edit; `ConfigNavPage` + tree editor; list/edit Nav links. `canAddChild` is group-only (and depth-capped).

## Next

P5.
