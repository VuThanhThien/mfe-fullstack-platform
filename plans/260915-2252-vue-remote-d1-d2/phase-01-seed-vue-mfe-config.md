# Phase 01 — Seed `vue` MfeConfig

## Context Links

- Spec §4 registry, §8 file ownership
- Scout §5 seeder
- `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 1h
- **Risk:** low
- **Parallel:** Wave 0 with P2, P3

Add idempotent seed row for Vue remote. Backend already accepts `framework: 'vue'`.

## Requirements

- Upsert by `routeName=vue`
- `remoteEntry`: `${PUBLIC_GATEWAY_URL}/r/demo-vue/mf-manifest.json`
- `remoteName=demoVue`, `exposedModule=./App`, `title=Vue Dashboard`, `framework=vue`
- Scopes: `[DASHBOARD]` (same as product/article)
- No migration — column already exists

## Related Code Files

**Modify**
- `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts`

**Do not**
- FE apps, gateway, change `MFE_FRAMEWORKS` enum (already has vue)

## Implementation Steps

1. Add seed object alongside product/article/admin.
2. Keep upsert loop — no special case.
3. Run seeder locally (`make seed` or backend seed cmd) after gateway path exists (or accept 404 remoteEntry until P2/P3).
4. Optional: confirm admin read-all / accessible returns row for dashboard user.

## Todo

- [x] Seed row fields per spec
- [x] Seeder runs idempotent twice without error
- [x] Dashboard user `accessible` includes `routeName=vue`

## Success Criteria

- [x] DB row present with `framework=vue`, scopes DASHBOARD
- [x] Re-seed updates in place (no duplicate routeName)

## Risks

- Seed before remote exists → nav shows item early; OK if P4 ships same release window — document order: prefer seed with P3/P4 same cook wave.

## Security

- No new privileges; DASHBOARD scope only.

## Next Steps

P4/P5 consume this row; no dependency for P2/P3 compile.
