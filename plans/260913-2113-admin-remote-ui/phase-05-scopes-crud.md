# Phase 05 — Scopes CRUD

**Effort:** 1.5h · **Owns:** `remotes/admin-react/src/**` (scopes) · **Depends on:** P4 (same package; serial)

## Context Links

- Spec §6 soft guards
- `backend/src/api/scope/scope.controller.ts`

## Overview

List / create / edit / delete scopes. UI forbids deleting scope named `ADMIN`.

## Implementation Steps

1. API helpers for `/api/v1/scopes`.
2. List: name, description; Create / Edit forms.
3. Delete: ConfirmDialog; if `name === 'ADMIN'` → button disabled + helper text.
4. After create, scopes available in Users/Configs multi-select (refetch on focus or invalidate list).

## Todo List

- [x] Full CRUD UI
- [x] Block delete `ADMIN`

## Success Criteria

- New scope creatable and assignable on user edit
- Cannot delete `ADMIN` from UI

## Next

P6 MfeConfigs CRUD.
