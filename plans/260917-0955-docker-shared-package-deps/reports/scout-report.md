# Scout summary — Docker package deps

Date: 2026-09-17

## Pain

- `pnpm add --prod` peer pins duplicated in shell / admin-react / demo-react; landing uses `npm --no-save` same list
- Mutates image package state; not lockfile-driven
- admin/demo-react double SDK install for SyncedMemoryRouter
- No pnpm workspace (CLAUDE.md)

## Recommendation

**B:** put auth runtime set in `@mfe/ui` `dependencies` → `--prod` frozen install.  
**Defer A** (shared base image). **Reject C** (workspace).

Full scout: agent session `a066afe5-6834-4725-bddd-12739fa1f3ba`.
