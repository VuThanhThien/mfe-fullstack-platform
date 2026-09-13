# Phase 01 — Seed admin MfeConfig

**Effort:** 1h · **Owns:** `backend/src/database/seeds/**` · **Depends on:** —

## Context Links

- Spec §4 seed table
- Existing: `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts`
- Scope constant: `ADMIN_SCOPE` in `@/constants/app.constant`

## Overview

Idempotent seed so `GET /api/v1/mfe-configs/accessible` returns Admin remote for users owning `ADMIN`.

## Implementation Steps

1. Extend mfe-config seeder (or add ordered seeder after scope seeder) to upsert config:
   - `routeName: 'admin'`
   - `remoteName: 'adminReact'`
   - `exposedModule: './App'`
   - `title: 'Admin'`, `framework: 'react'`
   - `remoteEntry: ${PUBLIC_GATEWAY_URL}/r/admin-react/mf-manifest.json`
   - `scopes: [adminScope]` (`ADMIN`)
2. Heal `remoteEntry` on re-run if URL drifted (same pattern as demo).
3. Do **not** grant admin user `DASHBOARD` (preserve “ADMIN ≠ see demo” demo of intersection).
4. Run `pnpm seed:run`; verify via admin login token + accessible (or SQL/API).

## Todo List

- [x] Seed admin MfeConfig idempotent
- [x] Heal remoteEntry URL
- [x] Manual verify accessible for admin includes `routeName=admin`

## Success Criteria

- Admin JWT → accessible contains Admin config
- Dashboard-only user → accessible does **not** include Admin
- Re-run seed does not duplicate / rehash passwords

## Risk

| Risk | Mitigation |
|------|------------|
| Filename order breaks ADMIN scope lookup | Reuse existing scope seeder order; `findOneByOrFail({ name: ADMIN_SCOPE })` |

## Next

P2 gateway (parallel with P1).
