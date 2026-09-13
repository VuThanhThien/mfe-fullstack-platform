# Phase 07 — Smoke + docs

**Effort:** 1h · **Owns:** `Makefile`, smoke scripts, umbrella docs · **Depends on:** P4–P6

## Context Links

- Spec §9 success metrics
- Existing: `Makefile` smoke targets, `scripts/e2e-demo-remote.mjs`
- Docs: `README.md`, `CLAUDE.md` non-goals, `docs/project-roadmap.md` D5

## Overview

Verify happy path; update umbrella docs so Admin UI is no longer “out of scope / API only”.

## Implementation Steps

1. Extend `make smoke` (or sibling target): curl admin mf-manifest via `:8080`.
2. Optional: `scripts/e2e-admin-remote.mjs` — login admin, assert accessible includes `admin`, hit one ADMIN API.
3. Update:
   - `README.md` — Admin remote + seed note; remove/adjust “Admin UI out of scope”
   - `CLAUDE.md` — move Admin UI out of Phase C non-goals / note Phase D5 shipped-when-done
   - `docs/project-roadmap.md` — D5 status
   - Spec status line → `approved — plan executed` when done
4. Local-dev guide: admin sees Admin; still no Demo unless `DASHBOARD` granted.

## Todo List

- [x] Smoke curl / script
- [x] README + CLAUDE + roadmap
- [x] Manual checklist from plan global success criteria

## Success Criteria

- Documented credentials + expected nav for admin vs dashboard user
- Smoke fails loudly if `/r/admin-react` missing

## Next

`/cook` implementation (or parallel cook of P1+P2).
