# Phase 6 — Spec B multi-surface (product / article)

## Context Links

- Spec B (full)
- `remotes/demo-react/vite.config.ts` — single `./App` expose
- `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts` — `demo` / `demoReact` / `./App`
- SDK `loadRemote` — already supports distinct `exposedModule`
- Depends on: P4 standalone entry exists (retarget to Product tree)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 3h
- **Risk:** medium — seed + e2e + federation rename churn

Prove hybrid model: nested **category** under **Product**; second expose **Article** + second `MfeConfig`; same `remoteName: productReact`, both `[DASHBOARD]`.

## Requirements

- Vite exposes: `./Product`, `./Article` — each `{ mount, unmount }` with **separate** module-level roots.
- Nested routes under Product: list/detail + **categories** (+ article-under-product as needed).
- Article expose: thin hub page for shell nav proof.
- Seed replace `demo` → `product` + add `article`; `remoteName: productReact`; `exposedModule` match; `remoteEntry` may keep `/r/demo-react/...` until folder rename.
- Federation `name` should match `remoteName` (`productReact`) — **required** for `loadRemote` module ids.
- Standalone (P4): mounts **Product** tree only.
- Docs blurb in `docs/code-standards-frontend.md`: split rule C + same-`remoteName` convention + anti-patterns.
- Update `scripts/e2e-demo-remote.mjs` (or rename) for `/app/product` (+ optional `/app/article`).

## Related Code Files

**Create**
- `remotes/demo-react/src/exposes/product.tsx`
- `remotes/demo-react/src/exposes/article.tsx`
- Product/Article app route modules

**Modify**
- `remotes/demo-react/vite.config.ts` — exposes + federation name
- Remove or deprecate old `expose.tsx` `./App`
- Seeder MfeConfig rows
- E2E script, any hard-coded `demo` route in docs/scripts
- `docs/code-standards-frontend.md`

**Optional / defer**
- Rename folder `demo-react` + Caddy `/r/product-react` — not required if `remoteEntry` path stays

## Implementation Steps

1. Introduce Product app with nested category routes; migrate Demo pages or replace with thin product/category UI.
2. Add Article expose + page.
3. Update vite `exposes` + `name: 'productReact'`.
4. Reseed: idempotent by `routeName`; remove orphan `demo` if present.
5. Standalone entry → Product + SessionGate.
6. Run shell path: dashboard user sees Products + Articles.
7. Write standards blurb.

## Tests

- SDK remote.spec fixtures updated if they hardcode `demoReact`/`./App`.
- Manual/e2e: `/app/product`, nested category, `/app/article`.
- `make seed` + login dashboard user.

## Acceptance

- [x] Two nav items, one bundle `productReact`
- [x] Category nested-only (no Category expose)
- [x] Standalone = Product tree
- [x] Standards doc updated
- [x] E2E/script paths updated

## Risks

- Existing DBs with `demo` row — seeder should update-or-delete; document `make seed` after pull.
- Changing federation `name` breaks cached module ids — hard refresh / force register already used.
