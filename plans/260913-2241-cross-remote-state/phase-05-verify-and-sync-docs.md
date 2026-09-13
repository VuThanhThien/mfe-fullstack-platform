# Phase 5 — Verify + sync docs

## Context Links

- `plans/260913-2241-cross-remote-state/plan.md` — global success criteria
- `plans/260913-2113-admin-remote-ui/plan.md:71-73,101` — broken link + unticked criterion
- `docs/codebase-summary.md` §5.2/§5.3 — shell context + remote contract
- `docs/system-architecture.md` §3.4/§3.5 — auth flow + SDK contract (868 lines: keep edits minimal)
- `scripts/e2e-demo-remote.mjs` — browser check that **cannot run** (puppeteer undeclared)

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 1h
- **Risk:** medium — verification tooling is missing

Prove the new behaviour end-to-end and make the documentation set self-consistent, including pre-existing inconsistencies this work surfaced.

## Key Insights

- `scripts/e2e-demo-remote.mjs` imports `puppeteer`, which is declared nowhere (there is no root `package.json`). **Decided 2026-09-13:** create a root `package.json` with `puppeteer` as a devDependency and make the script runnable.
- Three docs currently assert *"no root package.json"* — `CLAUDE.md:69`, `README.md:102`, `docs/code-standards-frontend.md:68`. Creating one **falsifies all three**; they must be corrected in this phase.
- The admin plan is internally inconsistent with the rest of the repo: `status: pending` and an unticked deep-link criterion, while `CLAUDE.md` already states *"Admin Remote UI ✓ Complete"*.
- The admin plan links `../260913-2118-fe-libs-modernize/plan.md`, which **no longer exists** (that plan directory was removed). A stale link that teaches a wrong inventory.
- `docs/system-architecture.md` is 868 lines, over the ~800 guideline and already flagged as the next split candidate — so touch it surgically.

## Requirements

- Record reproducible evidence for each global success criterion (command + observed result).
- Zero broken relative links across docs/plans/READMEs after the pass.
- Do not claim unverified behaviour: label anything not executed as unverified.

## Related Code Files

**Modify**
- `plans/260913-2241-cross-remote-state/plan.md` — status + outcome
- Each phase file — `## Actual Outcome`
- `plans/260913-2113-admin-remote-ui/plan.md` — status, criterion, broken link
- `docs/codebase-summary.md` §5.2/§5.3
- `docs/system-architecture.md` §3.4 (refetch trigger) and §3.5 (amended remote contract)
- `CLAUDE.md` — guarantee #8 amended; "no root package.json" corrected
- `README.md` — "no root package.json" corrected
- root `package.json` (create) + `scripts/e2e-demo-remote.mjs` (fix)

## Implementation Steps

1. **Create the root `package.json`** (approved) — dev tooling only:
   - **must not** declare `workspaces` — per-app package managers stay unchanged;
   - add `puppeteer` as a `devDependency` (pin a major, e.g. `^23`), plus a script such as `"test:e2e": "node scripts/e2e-demo-remote.mjs"`;
   - run `npm install` at the root and confirm root `node_modules` is already excluded from the Docker build context by the bare `node_modules` rule in `.dockerignore`;
   - fix `scripts/e2e-demo-remote.mjs` if it needs a launch flag for the local Chromium;
   - verify **no app is disturbed**: each app still installs, typechecks and builds exactly as before (its own lockfile untouched).
2. Run the global criteria and capture evidence:

   | Criterion | How to verify |
   |-----------|---------------|
   | Deep-link survives refresh | Hard refresh on `/app/admin/users`; expect the Users table, not NotFound |
   | Nav updates without reload | Create an `MfeConfig` in admin → switch tab and back → nav shows it |
   | No remount on refetch | Open a half-filled form → switch tab and back → input still present |
   | `?page=2` shareable | Open the URL cold; refresh; press back |
   | No storage writes | `packages/mfe-sdk` suite still green; grep `shell/src` + `remotes/*/src` for `localStorage`/`sessionStorage` |
   | Contract intact or amended | Diff `types.ts` against guarantee #8 wording |
   | Regressions | `make smoke` (4 gateway routes + direct `/health`), SDK `pnpm test` (44), typecheck/build for shell + the touched remote |

3. **Fix the admin plan inconsistencies:**
   - set `status` to match reality (`completed` if the admin work is genuinely done, otherwise leave and say so);
   - tick `L101` deep-link criterion **only if** Phase 1 verification passed;
   - repoint the removed `260913-2118-fe-libs-modernize` link — either to
     [`docs/code-standards-frontend.md`](../../docs/code-standards-frontend.md) (which carries the inherited form/HTTP rules) or state that the plan was consolidated away.
4. **Sync the docs that describe what changed:**
   - `docs/codebase-summary.md` §5.2 — `RemoteContext` now exposes `refreshAccessibles`/`isRefreshing`; shell route is `:routeName/*`; add the root `package.json` to the root-files list.
   - §5.3 — record that the demo remote ignores ctx while `admin-react` consumes `{ basePath, routeName, onNotify }`.
   - `docs/system-architecture.md` §3.4 — add the refetch trigger to the boot/refresh description (2–3 lines max).
   - `docs/system-architecture.md` §3.5 + `CLAUDE.md` guarantee #8 — Phase 4 is **in scope**, so the amended contract wording must land.
   - **Correct the three "no root package.json" assertions:** `CLAUDE.md:69`, `README.md:102`, `docs/code-standards-frontend.md:68` → root `package.json` exists **for repo-level dev tooling only** (puppeteer), defines **no** `workspaces`, and does not change any app's package manager.
5. Run the relative-link checker across `docs/`, `plans/`, and every README; fix or report every broken target.
6. Write `## Actual Outcome` in each executed phase file and update `plan.md` status.
7. **Do not commit** — leave the working tree for the user.

## Todo List

- [ ] Root `package.json` created — puppeteer devDep, **no** `workspaces`
- [ ] `node scripts/e2e-demo-remote.mjs` runs end-to-end
- [ ] No app install/typecheck/build disturbed (lockfiles untouched)
- [ ] All global criteria executed with evidence (or marked unverified)
- [ ] Admin plan: status + criterion reconciled
- [ ] Admin plan: stale fe-libs link fixed (decision 4)
- [ ] 6 broken links to the removed fe-libs plan repointed
- [ ] "no root package.json" corrected in CLAUDE.md, README.md, code-standards-frontend.md
- [ ] `codebase-summary.md` §5.2/§5.3 synced
- [ ] `system-architecture.md` §3.4/§3.5 synced + guarantee #8 amended
- [ ] Link check: 0 broken across docs/, plans/, READMEs
- [ ] Phase files + plan status updated

## Success Criteria

- Every global success criterion has a command/observation behind it, or is explicitly labelled unverified.
- Link check reports 0 broken relative links across `docs/`, `plans/`, READMEs.
- Plan and phase statuses reflect reality; no plan claims "complete" with unticked criteria.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| No browser tooling → unverifiable claims | Step 1 forces an explicit choice; label anything not executed |
| Docs drift again after this pass | Phase status stays `pending` until outcomes are written |
| Editing the 868-line architecture doc grows it further | Cap edits at a few lines; splitting it is a separate decision |
| Ticking admin criterion without real verification | Tie it to Phase 1's recorded evidence only |

## Security Considerations

- Evidence must not include real tokens or cookies in screenshots/logs; redact anything session-bearing.
- If `puppeteer` is added, pin it and note the supply-chain surface; keep it a devDependency only.
- Re-confirm no storage writes after the refetch work — memory-only posture must survive the change.

## Next Steps

After this phase the feature is done and the docs are consistent. Deferred: option D (narrow SDK store) — revisit only if Phases 2–3 prove insufficient in practice.
