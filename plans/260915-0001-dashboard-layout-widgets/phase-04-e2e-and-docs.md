# Phase 4 — E2E + docs sync

## Context Links

- Spec §7, §9, §11 (testing, success, supersession)
- Scripts: `scripts/e2e-demo-remote.mjs` (and optionally cross-remote)
- Docs: `docs/code-standards-frontend.md`, `docs/codebase-summary.md`, `docs/project-roadmap.md`, `CLAUDE.md`, `packages/mfe-ui/README.md` (already in P1)
- Spec: link from public docs/plan only — **do not edit** `docs/brainstorm/*` (CLAUDE preserve rule)

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 2h
- **Risk:** low

Prove Home + Dashboard via Puppeteer; guard shell against widgets import; update **public** docs to supersede “theme-only / React-free `@mfe/ui`”. Plan.md owns approval status — never mutate brainstorm files.

## Key Insights

- Extend existing e2e — don’t replace token/theme checks.
- Compose volumes for mfe-ui already exist (theme plan) — verify only; no compose ownership fight unless missing.
- Admin: browser smoke list page under new chrome (manual or light assert) — **no admin src edits**.

## Requirements

- E2E: Home marker; `/app/demo/dashboard` marker; **hard refresh dashboard** still on dashboard (not Status copy); theme toggle; storage **allowlist** ≈ `[mfe-ui-mode]` only (empty sessionStorage).
- Prefer selector waits over `networkidle2` where flaky; ignore known benign recharts dimension warnings if needed.
- Grep: shell must not import `@mfe/ui/widgets`.
- Docs (roadmap/codebase-summary/standards/CLAUDE/README): package role = theme + layout + widgets; feedback per-app.
- Verify `docker compose build` shell + demo-react after P1 peer churn (or document evidence from cook).

## Related Code Files

**Modify**

- `scripts/e2e-demo-remote.mjs`
- `docs/code-standards-frontend.md`
- `docs/codebase-summary.md`
- `docs/project-roadmap.md` (Phase D UI progress)
- `CLAUDE.md` (topology / `@mfe/ui` blurb)
- `README.md` if it still says theme-only

**Must not touch:** app product logic (evidence-only); **`docs/brainstorm/**`**

## Implementation Steps

1. Extend e2e-demo-remote: Home marker; dashboard marker; hard-refresh dashboard; allowlist storage; keep theme checks.
2. Run e2e against `make up` stack (rebuild images if P1 peers changed).
3. Grep: no `@mfe/ui/widgets` under `shell/`.
4. Update standards/summary/roadmap/CLAUDE/README for new package scope; link brainstorm as historical.
5. Optional: `make smoke` still green.

## Todo List

- [x] Extend e2e (Home + Dashboard + hard refresh + allowlist storage)
- [x] Grep guard shell widgets import
- [x] Docs + CLAUDE + README sync (no brainstorm edits)
- [x] Docker build evidence shell + demo if needed
- [x] Record evidence in plan checkboxes

## Success Criteria

- [x] E2E script exits 0 with new asserts
- [x] Docs no longer claim `@mfe/ui` is React-free/theme-only
- [x] Brainstorm files untouched in this phase

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Flaky chart render timing | Assert text titles, not SVG paths |
| Status route copy changed | Keep soft assert or skip if removed |

## Security Considerations

- Re-assert no access/refresh tokens in web storage.

## Next Steps

Plan complete → cook done → optional follow-ups (Status polish, SettingsDrawer, real metrics APIs).
