# Phase 5 — E2E + docs sync

## Context Links

- Spec §7–§10; plan ownership: compose, scripts, docs
- `docker-compose.yml` — mfe-sdk src volumes for shell/demo/admin/landing
- `scripts/e2e-demo-remote.mjs` — existing demo smoke
- `docs/project-roadmap.md` — Phase D UI TODO; add Landing → Next.js
- `docs/code-standards-frontend.md`, `CLAUDE.md`, `docs/codebase-summary.md`
- Spec status line in brainstorm file
- Depends on: P1–P4 code complete

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Risk:** low

Compose hot-reload volumes for `@mfe/ui`; extend e2e; sync docs including **Landing → Next.js** deferred TODO. Mark plan criteria with evidence.

## Key Insights

- Compose is one file — exclusive to this phase to avoid P2/P3/P4 conflicts.
- Landing keeps mfe-sdk volume only (no mfe-ui).
- Mode key assertion must coexist with “no tokens in localStorage” checks.

## Requirements

- `docker-compose.yml`: add `./packages/mfe-ui/src:/workspace/packages/mfe-ui/src` for **shell**, **demo-react**, **admin-react** (not landing).
- E2E (extend or sibling script): demo mount, toggle mode key, `/app/demo/status`, hard refresh, tokens absent except mode key.
- Docs updated per spec §8.
- Spec frontmatter/status → approved / plan linked.
- `make smoke` still green when stack up.

## Related Code Files

**Modify**

- `docker-compose.yml`
- `scripts/e2e-demo-remote.mjs` (or `scripts/e2e-theme-mode.mjs` + README pointer)
- `docs/project-roadmap.md`
- `docs/code-standards-frontend.md`
- `docs/codebase-summary.md`
- `docs/system-architecture.md` (surgical — theme package note only if needed)
- `CLAUDE.md` — topology `packages/mfe-ui/`
- `README.md` — brief mention if package list exists
- `docs/brainstorm/2026-09-14-shared-theme-mfe-ui-spec.md` — status approved + plan path
- `plans/260914-2316-shared-theme-mfe-ui/plan.md` — check success criteria as evidence lands

**Must not touch**

- App product logic (unless e2e reveals blocker — then fix in owning phase / tiny follow-up)

## Implementation Steps

1. Compose volumes for shell/demo/admin:
   ```yaml
   - ./packages/mfe-ui/src:/workspace/packages/mfe-ui/src
   ```
2. Extend e2e:
   - After demo loads: click shell theme toggle (add `data-testid="theme-mode-toggle"` in P2 if missing — **if P2 already merged without testid**, use aria-label; prefer adding testid in P2 — if late, patch shell in this phase only for testid **or** assert localStorage after evaluating `setMode` via page.evaluate importing is hard; prefer testid owned by P2).
   - Assert `localStorage.getItem('mfe-ui-mode')` is light or dark.
   - Goto `/app/demo/status`; assert text; reload; still not shell NotFound.
   - Assert no `accessToken` / `refreshToken` / `token` keys in localStorage/sessionStorage.
3. Roadmap:
   - Check off / note progress on theme TODO.
   - Add deferred: **Landing app migrate to Next.js** (separate brainstorm; out of `@mfe/ui` phase).
4. code-standards-frontend: `@mfe/ui` usage; mode storage exception (theme only).
5. CLAUDE.md + codebase-summary topology.
6. Spec status → approved; link this plan.
7. Run: `@mfe/ui` tests; shell/demo/admin typecheck; `make smoke`; e2e when Docker up.
8. Tick global success criteria in `plan.md` with Code/Browser evidence notes.

## Todo List

- [x] compose mfe-ui volumes (shell/demo/admin)
- [x] e2e: mode + status + refresh + token hygiene
- [x] roadmap theme + Landing Next.js TODO
- [x] frontend standards + CLAUDE + codebase-summary
- [x] spec status → approved
- [x] record evidence on plan criteria

## Success Criteria

- Hot reload of `@mfe/ui` src works under `make up` for MF apps. — compose volumes added; Docker runtime UNVERIFIED
- E2E documents mode sync + demo nested route. — script extended; run UNVERIFIED without stack
- Docs mention `@mfe/ui` and Landing → Next.js TODO. — ✓
- No landing import of `@mfe/ui` (grep). — ✓

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| E2E fragile selectors | `data-testid` on toggle from P2; coordinate |
| Docs drift | Single pass; link spec + plan |
| Docker not available | Mark browser criteria UNVERIFIED like prior plan |

## Next Phase

Plan complete → `/cook` done. Follow-ups: Landing Next.js brainstorm; optional MF-shared `@mfe/ui`; component catalog ports.
