# Phase 06 — MfeConfigs CRUD

**Effort:** 2h · **Owns:** `remotes/admin-react/src/**` (configs) · **Depends on:** P5

## Context Links

- Spec §5–§8
- `CreateMfeConfigReqDto` / `UpdateMfeConfigReqDto`
- ADMIN list: `GET /api/v1/mfe-configs` (not `accessible`)

## Overview

Manage registry rows: remoteEntry, remoteName, exposedModule, routeName, title, framework, scopeNames.

## Implementation Steps

1. List via **ADMIN** `GET /api/v1/mfe-configs` (full registry).
2. Create/Edit form fields matching DTO; `framework` select `react|vue|angular`; `routeName` pattern hint.
3. `scopeNames` multi-select required on create (`ArrayNotEmpty`).
4. Delete with confirm; warn if deleting the `admin` or `demo` seeded rows (allow but Confirm copy strong).
5. Optional UX note on edit: changing Admin config scopes can remove Admin from own nav until fixed via API.

## Todo List

- [x] List/create/edit/delete configs
- [x] Validation aligned with DTO
- [x] Strong confirm on destructive/seeded rows

## Success Criteria

- New config with a scope appears in that scope’s user `accessible` after their token refresh/re-login
- Admin list shows all configs including ones admin cannot “access” as end-user

## Next

P7 smoke + docs.
