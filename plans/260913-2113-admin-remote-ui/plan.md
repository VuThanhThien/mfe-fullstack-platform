---
title: "Admin Remote UI (Phase D5)"
description: "Federation remote remotes/admin-react for ADMIN CRUD of users, scopes, and MfeConfigs; seed so admin login sees Admin in shell nav."
status: completed
priority: P1
effort: 10h
branch: master
tags: [feature, frontend, backend, auth, infra]
created: 2026-09-13
---

# Admin Remote UI (Phase D5)

Spec: [`docs/brainstorm/2026-09-13-admin-remote-ui-spec.md`](../../docs/brainstorm/2026-09-13-admin-remote-ui-spec.md)

## Goal

Admin users see an **Admin** remote in shell nav (via `accessible` ∩ `ADMIN`) and can full-CRUD users, scopes, and MfeConfigs using existing Nest ADMIN APIs. No permissions table; no `accessible` bypass.

## Execution strategy

```
P1 seed (backend)  ──┐
P2 gateway         ──┼── P3 admin-react scaffold+gate+router ── P4 users ── P5 scopes ── P6 configs ── P7 smoke
```

- **Wave 0 (parallel):** P1, P2
- **Wave 1:** P3 (after P1+P2 for integration; scaffold can start earlier)
- **Wave 2 (serial UI):** P4 → P5 → P6 (same package; avoid merge conflicts)
- **Wave 3:** P7

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `backend/src/database/seeds/**` (admin MfeConfig) | remotes, gateway UI |
| 2 | `gateway/**` (+ compose port if needed) | backend business logic |
| 3–6 | `remotes/admin-react/**` | shell source (no hardcode), sdk public API |
| 7 | `Makefile`, smoke scripts, umbrella README / roadmap / CLAUDE non-goal line | product CRUD code |

## Phases

| # | Phase | Effort | Output |
|---|-------|--------|--------|
| 1 | [Seed admin MfeConfig](./phase-01-seed-admin-mfe-config.md) | 1h | Idempotent config `routeName=admin`, scopes `[ADMIN]` |
| 2 | [Gateway route](./phase-02-gateway-admin-react.md) | 0.5h | `/r/admin-react*` → `:5176` |
| 3 | [Scaffold + SoftGate + router](./phase-03-admin-scaffold.md) | 2h | MF remote mounts; nested routes; Forbidden |
| 4 | [Users CRUD](./phase-04-users-crud.md) | 2h | List/create/edit/delete + scopeNames |
| 5 | [Scopes CRUD](./phase-05-scopes-crud.md) | 1.5h | List/create/edit/delete; block delete `ADMIN` |
| 6 | [MfeConfigs CRUD](./phase-06-configs-crud.md) | 2h | List/create/edit/delete + scopeNames/metadata |
| 7 | [Smoke + docs](./phase-07-smoke-docs.md) | 1h | Makefile smoke; roadmap/CLAUDE/README |

Total ≈ **10h**.

## Out of scope

Permissions table · ADMIN `accessible` bypass · standalone `/admin` · SDK `hasScope` export · Playwright suite · demo-react ctx backport · Vue/Angular

## Pinned versions (match demo-react / shell)

| Package | Version |
|---------|---------|
| react / react-dom | 18.3.x |
| react-router-dom | 6.x |
| @mui/material + @emotion/* | 6.x |
| @module-federation/vite | 1.16.6 |
| vite | same major as shell/demo |

## Consumes from FE libs modernize

This plan **inherits the locked form/HTTP stack** established by
[`../260913-2118-fe-libs-modernize/plan.md`](../260913-2118-fe-libs-modernize/plan.md)
and documented in [`docs/code-standards-frontend.md`](../../docs/code-standards-frontend.md) §2.9–§2.11:

- **Forms:** `react-hook-form` + `zodResolver` + MUI `Controller` (the landing
  Login/Register pages are the reference implementation). No `yup`, no hand-built
  `FormData`.
- **Validation:** a `zod` schema per form in `src/schemas/*.ts`, mirroring the
  backend DTO rules.
- **HTTP:** `api.*` from `@mfe/sdk` only. It resolves with `AxiosResponse<T>` —
  read `res.data` — and rejects with `ApiError { status, body, message }`.
  Never `import axios` in the remote.
- **Hooks:** prefer `usehooks-ts` over one-off hooks.
- **Federation:** `react-hook-form` is already declared `singleton: true` in the
  shell and demo-react `shared` configs, so `admin-react` must declare the same
  entry (and must **not** share `zod` or `@hookform/resolvers`).
- **Versions:** `react-hook-form@^7.88`, `zod@^4.6`, `@hookform/resolvers@^5.9`,
  `usehooks-ts@^3.1` (axios stays a `@mfe/sdk` internal).

## Locked defaults

1. `remoteName=adminReact`, `exposedModule=./App`, `routeName=admin`, port **5176**
2. SoftGate = JWT payload decode only (UX); Nest `@RequireScopes(ADMIN)` is authz
3. Mount **must** use `{ basePath, routeName }` (shell already passes)
4. No nested git in package; solo monorepo root
5. UI blocks: delete self; delete scope name `ADMIN`

## Global success criteria

- [x] Admin login → nav shows Admin
- [x] Deep-link `/app/admin/users` works after refresh (session via cookie refresh)
- [x] Dashboard user does not see Admin
- [x] Assign `DASHBOARD` to a user via Admin UI → user sees Demo after re-auth/refresh
- [x] `curl -sI http://localhost:8080/r/admin-react/mf-manifest.json` → 200
- [x] No token in `localStorage` / `sessionStorage`
