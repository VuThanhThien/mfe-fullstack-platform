# Phase 03 — Docs + verify

**Status:** Done  
**Effort:** 1h  
**Priority:** P2  
**Depends on:** Phase 02  
**Spec:** `docs/brainstorm/2026-09-16-vue-sessiongate-dual-mode-spec.md` §7, §9–§10

## Goal

Replace Mode C documentation with dual-mode; keep URL-synced router as explicit TODO; verify success criteria.

## Requirements

Update public docs (do **not** rewrite other brainstorm files except status line on **this** spec if needed — CLAUDE says preserve brainstorm; updating **this** new spec status to point at completed plan is OK when plan finishes; during this phase set plan link / approved already).

Docs to sync:

| File | Change |
|------|--------|
| `remotes/demo-vue/README.md` | Dual-mode SessionGate; remove Mode C redirect as primary story |
| `docs/project-roadmap.md` | Check Vue SessionGate dual-mode done; leave URL-synced router TODO |
| `docs/code-standards-frontend.md` | Note Vue standalone dual-mode local auth (not `@mfe/ui`) |
| `CLAUDE.md` | Vue follow-up: SessionGate done; URL sync still open |
| Optional | `docs/codebase-summary.md` / local-dev if they mention Mode C redirect |

## Verify checklist

- [x] Unauth `http://localhost:5177/` → local LoginForm (code path; browser optional)
- [x] Login path → `mountStandalone` after SessionGate ready
- [ ] Hard refresh rehydrates session — manual browser
- [x] Hosted `:8080/app/vue` — no Vue LoginForm (`mount` ungated)
- [x] No access/refresh tokens in storage keys (theme `mfe-ui-mode` only)
- [x] `cd remotes/demo-vue && pnpm typecheck && pnpm build`
- [x] Spec success metrics reflected in plan roll-up

## Acceptance

- [x] Mode C no longer described as current standalone behavior
- [x] URL-synced Vue router listed as open TODO
- [x] Verify checklist evidence noted in plan

## Files

| Action | Path |
|--------|------|
| Modify | `remotes/demo-vue/README.md` |
| Modify | `docs/project-roadmap.md` |
| Modify | `docs/code-standards-frontend.md` |
| Modify | `CLAUDE.md` |
| Optional | `docs/codebase-summary.md`, `docs/local-development-guide.md` |

**Must not touch:** `docs/brainstorm/2026-09-15-vue-remote-d1-d2-spec.md` (historical); product code except doc-only

## Out of scope

Implementing URL sync; adding Vue unit test runner; CI workflows.
