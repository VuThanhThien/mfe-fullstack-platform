# Phase 01 — Backend nav entity + API

**Priority:** P1  
**Status:** Complete  
**Effort:** 9h  
**Owns:** `backend/` (mfe-config + nav + migrations + seeds)  
**Spec:** §5 Data model & API  
**Blocked by:** —

## Overview

Add `icon_url` on `mfe_config`; create `mfe_nav_item` + `mfe_nav_item_scope`; implement accessible tree + ADMIN CRUD; seed sample trees.

## Key insights

- Copy M2M from `mfe_config_scope` / migration `1789171200002`.
- Next migration stamp: `1789171200005-…`.
- Declare `nav/accessible` and `nav-items` routes before ambiguous `:id` traps.
- Every node requires ≥1 scope on write.
- Config not in user’s accessible set → **404** on nav/accessible.

## Requirements

- Adjacency list tree; `group`|`route`; relative path regex.
- Filter: ANY-overlap; drop orphaned children; drop empty groups.
- https-only `iconUrl`.
- Cascade delete items with config; cascade children with parent.

## Related files

**Create**

- `backend/src/database/migrations/1789171200005-mfe-nav-item-and-icon-url.ts`
- `backend/src/api/mfe-config/entities/mfe-nav-item.entity.ts` (or `mfe-nav/` module)
- DTOs: create/update/reorder/res tree
- `.../mfe-nav-item.service.ts` + controller methods (extend module)
- `backend/src/database/seeds/1722335727100-mfe-nav-item-seeder.ts` (after config seeder)
- `*.spec.ts` + e2e blocks

**Modify**

- `mfe-config.entity.ts` — `iconUrl` column
- create/update/res DTOs — `iconUrl?`
- `mfe-config.controller.ts` / service — wire nav routes; keep `accessible` first
- `mfe-config.module.ts` — providers
- `scope.entity.ts` — inverse relation optional

## Implementation steps

1. Migration: `icon_url` nullable; `mfe_nav_item` table; `mfe_nav_item_scope` join; FKs + indexes (`mfe_config_id`, `parent_id`, `sort_order`).
2. Entities + JoinTable naming mirror existing conventions.
3. Service: `findNavAccessible(userId, routeName)`; admin CRUD; reorder batch; cycle detection on parent change; path validation.
4. Controller routes (order matters):
   - `GET :routeName/nav/accessible` — use `routeName` param (not uuid) — **conflict:** existing `GET :id` is UUID. Prefer:
     - `GET by-route/:routeName/nav/accessible` **or**
     - dedicated `@Controller('mfe-configs')` method with Parse that distinguishes — **spec preferred:** `GET mfe-configs/by-route/:routeName/nav/accessible` to avoid UUID pipe clash.
   - **Lock for implementers:** use `GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible` (auth). Admin stays on UUID `:id/nav-items`.
5. Update `MfeConfig` create/update/res for `iconUrl`.
6. Seeder: trees for `product`, `admin`, `vue` (and `article` if useful) with DASHBOARD/ADMIN scopes.
7. Unit tests: filter matrix; 404; validation 422; CRUD.
8. e2e: admin creates node; dashboard user sees filtered tree.

## Todo

- [x] Migration 0005 applied cleanly
- [x] Entities + module wired
- [x] `by-route/:routeName/nav/accessible` + ADMIN nav-items CRUD
- [x] `iconUrl` on MfeConfig DTOs
- [x] Seeder sample trees
- [x] Unit + e2e green

## Success criteria

- Swagger shows new routes (dev).
- Dashboard user gets product tree without ADMIN-only nodes.
- Admin without scope on node cannot… (admin CRUD is ADMIN-scoped; filter test uses dashboard token).

## Risks

| Risk | Mitigation |
|------|------------|
| `:id` vs `routeName` collision | `by-route/:routeName/...` prefix |
| Cycle parents | Reject if ancestor chain contains self |
| Empty scope list | `@ArrayNotEmpty` |

## Security

- No ADMIN bypass on accessible nav.
- https icon URLs only.
- Nav never grants API access.

## Implementation status

Shipped 2026-09-16. Nav lives under `mfe-config` (not a separate `mfe-nav` module). `scope.entity.ts` inverse left untouched (ownership); nav-item scope FK is still NO ACTION. Server enforces max depth 5.

Post-review (same day): seed paths match real remote routes (no fake segments / empty index leaves); parent must be `group` (`BadRequestException` + unit test).

## Next

Unblocks P2 + P4.
