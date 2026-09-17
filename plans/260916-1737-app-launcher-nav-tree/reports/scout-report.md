# Scout + design inputs (session)

**Source:** explore scout 2026-09-16; brainstorm decisions locked in spec.

## Codebase facts

- Flat nav: `ShellLayout` maps `accessibles` → Links
- Latest migration: `1789171200004` → next `1789171200005`
- M2M pattern: `mfe_config_scope` / `user_scope`
- Seed hook: `1722335727000-mfe-config-seeder.ts` + new nav seeder after
- SDK: `MfeAccessibleItem` lacks `iconUrl`; no nav types
- Admin: configs CRUD under `remotes/admin-react/src/pages/configs/`

## Design locks (do not reopen)

Shell-owned sidebar; scope-only per-node; 1 MfeConfig = 1 tree; Home+Apps; group|route; https iconUrl; lazy nav; Approach 1 entity.

## Tree storage

Adjacency list (`parent_id` + `sort_order`) — matches admin CRUD + TypeORM; avoid materialized path v1.

## Icon risk

https-only validation; render `<img>`; CSP `img-src` documented; no MinIO.
