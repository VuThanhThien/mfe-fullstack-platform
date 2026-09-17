# PM Sync-Back: App Launcher + Nested Nav Tree

**Date:** 2026-09-16 22:32  
**Plan:** `plans/260916-1737-app-launcher-nav-tree/`  
**Frontmatter:** `status: in-progress` (was `pending`)  
**Progress:** 19/23 phase todos (83%)

## Phase checkbox sweep

| Phase | Before | After | Status |
|-------|--------|-------|--------|
| P1 backend | 6/6 | 6/6 (already [x]; post-review note added) | Complete |
| P2 SDK | 0/3 | 3/3 | Complete |
| P3 shell | 0/5 | 5/5 | Complete |
| P4 admin | 0/5 | 5/5 | Complete |
| P5 docs/verify | 0/4 | 0/4 **left open** | Pending |

## Marked this pass

### P2
- [x] Types + exports (`MfeAccessibleItem.iconUrl?`, `MfeNavNode`)
- [x] README (lazy `by-route/:routeName/nav/accessible`)
- [x] Tests green (types-only; no wrapper fn)

### P3
- [x] HomeLauncher route
- [x] Header Apps popover
- [x] NavContext/hook + NavTree
- [x] ShellLayout wired; flat list removed
- [x] typecheck + build shell

### P4
- [x] iconUrl on config forms
- [x] nav-items API module
- [x] ConfigNavPage + editor UX (`canAddChild` group-only)
- [x] Routes + list links
- [x] typecheck/build

### P1 note (no new todos)
Post-review: seed paths match real remote routes; parent must be `group`.

## Roll-up (`plan.md` Success)

| Item | State |
|------|-------|
| Launcher Home + Apps; drawer nested from API | [x] |
| ADMIN tree CRUD + scopes + iconUrl | [x] |
| Filter/hide + 404 rules covered by tests | [x] |
| migrate+seed demo trees | [x] |
| typecheck/build green for touched packages | [ ] P5 verify |

## Unresolved (P5 — docs-manager / verify)

Authority docs **not** updated (only brainstorm spec mentions feature). Package READMEs (shell, admin-react, backend) **not** updated. SDK README is P2, not P5.

- [ ] Standards + roadmap + architecture blurb — `docs/code-standards-frontend.md`, `docs/project-roadmap.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`
- [ ] Package READMEs — `shell/README.md`, `remotes/admin-react/README.md`, `backend/README.md`
- [ ] `pnpm`/`npm` test & typecheck touched pkgs
- [ ] Plan checkboxes → done; frontmatter `status: completed` when shipped

## Unresolved mappings

None. All shipped P1–P4 work maps to existing phase todos.

Optional spec item `fetchAccessibleNav` not built — not a leftover `[ ]`; P2 called it nice-to-have.

## Next (MUST finish plan)

P5 still open. Plan **not** complete. Main agent: run docs-manager + verify gates, then re-sync P5 and set `status: completed`. Do not leave Wave D unfinished.
