# Phase 04 — Users CRUD

**Effort:** 2h · **Owns:** `remotes/admin-react/src/**` (users) · **Depends on:** P3

## Context Links

- Spec §5 API mapping
- `backend/src/api/user/user.controller.ts`
- DTOs: `CreateUserReqDto`, `UpdateUserReqDto` (`scopeNames`)

## Overview

List / create / edit / delete users; assign scopes via `scopeNames` full replacement.

## Implementation Steps

1. Local API helpers using `api` from `@mfe/sdk` (`GET/POST/PATCH/DELETE /api/v1/users`).
2. `UsersListPage`: table (email, username, scopes); pagination if DTO returns meta; Create button.
3. Create form: username, email, password, optional scope multi-select (load scopes from `GET /api/v1/scopes`).
4. Edit page `:id`: load user; edit bio/image/scopes (not username/email/password unless API allows — follow UpdateUserReqDto).
5. Delete: ConfirmDialog; disable if `user.id ===` current user from `GET /api/v1/users/me`.
6. Errors: surface Nest message on 400/422/403/404.

## Todo List

- [x] List + create + edit + delete
- [x] Scope multi-select
- [x] Block delete self

## Success Criteria

- Admin can create user with `DASHBOARD` and delete a non-self user
- 403/422 shown cleanly

## Next

P5 Scopes CRUD.
