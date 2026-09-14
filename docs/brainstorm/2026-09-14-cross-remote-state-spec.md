# Design Spec — Cross-Remote State Sharing

**Date:** 2026-09-14  
**Status:** approved (brainstorm) — design of record = plan (refreshed 2026-09-14)  
**Plan:** [`plans/260913-2241-cross-remote-state/`](../../plans/260913-2241-cross-remote-state/plan.md) (`status: pending`, ~7h)  
**Approach:** Execute existing plan as design of record (Approach 1)  
**Predecessor:** Admin Remote UI D5 ([spec](./2026-09-13-admin-remote-ui-spec.md)); Phase C platform

This is a **thin confirmation spec**. It records brainstorm decisions and the approved design summary. Detailed phase steps, file ownership, and risks live in the plan — do not duplicate them here. Where this spec and the plan conflict on implementation detail, **the refreshed plan wins**; the 2026-09-14 decision deltas in §2 remain authoritative for scope boundaries (incl. no SDK store, `onNotify` ≠ refetch).

---

## 1. Problem statement

Admin remote shipped (D5), but three platform gaps remain:

1. **Deep-link / refresh** — remote sub-routes like `/app/admin/users` need shell `:routeName/*` (splat already in `shell/src/App.tsx`; verify still required).
2. **Stale nav** — `accessible` fetched once at Gate boot; MfeConfig CRUD does not update shell nav until full reload.
3. **Unshareable list state** — admin list pages keep `page` in `useState`; refresh resets to page 1.
4. **Silent mutations** — no typed channel for remotes to surface success/error to shell UI without importing shell code.

### User stories

- As an admin, hard-refresh on `/app/admin/users` still shows the admin remote (not NotFound).
- As an admin, after creating/editing an MfeConfig, shell nav updates after tab focus/visibility — without full reload and without remounting the open remote.
- As an admin, I can share `/app/admin/users?page=2` and get the same page after refresh / back / forward (same for scopes + configs).
- As an admin, mutations show shell Snackbar feedback via optional `onNotify` — without an event bus or tokens in mount ctx.

### Non-goals

- Event bus / pub-sub across remotes
- SDK in-memory reactive store (plan option D — defer until A+B+C insufficient)
- Token / user / scopes in mount ctx
- Shell-owned router replacing per-remote `BrowserRouter`
- `onNotify` triggering `refreshAccessibles` (explicitly rejected 2026-09-14)
- Vue/Angular remotes; pnpm workspace conversion

---

## 2. Decisions locked

| # | Decision | Choice | When |
|---|----------|--------|------|
| 1 | Next phase after D5 | Finish cross-remote-state (not Vue / MinIO / UI port) | 2026-09-14 |
| 2 | Scope | Full plan P1–P5 (verify P1 + implement P2–P5) | 2026-09-14 |
| 3 | Refetch vs `onNotify` | Focus / `visibilitychange` only; `onNotify` = Snackbar only | 2026-09-14 |
| 4 | Design artifact | Approach 1 — existing plan is design of record; this file confirms | 2026-09-14 |
| 5 | Guarantee #8 | Amend additively: optional `onNotify`, `locale` | 2026-09-13 (plan) |
| 6 | Root `package.json` | Dev tooling + puppeteer only; **no** `workspaces` | 2026-09-13 (plan) |
| 7 | URL state | `?page=` on users + scopes + configs | 2026-09-13 (plan) |

---

## 3. Evaluated approaches

| Approach | Verdict |
|----------|---------|
| **1. Execute existing plan** | **Chosen** — plan already encodes architecture; avoids duplicate phase docs |
| 2. Rewrite full brainstorm + new plan | Rejected — churn without new decisions |
| 3. Re-architect (SDK store / event bus / shared router) | Rejected — violates non-goals; revisit only if A+B+C fail |

---

## 4. Final design (summary)

### Architecture

- **P1** Shell route `:routeName/*` (present in code; verify deep-link + NotFound).
- **P2** `Gate` + `RemoteContext` expose `refreshAccessibles` / `isRefreshing`; triggers = window focus + visibility→visible; stale-while-revalidate (`status` stays `'ready'`); in-flight dedupe.
- **P3** Admin lists: `useSearchParams` for `page`; defensive parse/clamp; document convention in `code-standards-frontend.md` §2.3.
- **P4** SDK `RemoteMountContext`; shell Snackbar + stable `onNotify`; admin optional-chains after mutations; amend `CLAUDE.md` + `system-architecture.md` + frontend satellite.
- **P5** Root `package.json` + puppeteer; browser evidence; docs/link sync (incl. 8 broken fe-libs links).

### Components / ownership

| Unit | Owns |
|------|------|
| `shell` App / Gate / RemoteContext / RemoteOutlet / ShellLayout | routing splat, refetch, ctx assembly, Snackbar |
| `remotes/admin-react` lists + expose | URL `?page=`, `onNotify` calls |
| `packages/mfe-sdk` types | `RemoteMountContext` |
| Umbrella P5 | root package.json, scripts, docs/plans hygiene |

### Data flow & interfaces

See approved brainstorm §2. Contracts:

```ts
// RemoteContext
{ userId, accessibles, refreshAccessibles(): Promise<void>, isRefreshing: boolean }

// SDK
interface RemoteMountContext {
  basePath: string;
  routeName: string;
  locale?: string;
  onNotify?: (n: { level: 'info' | 'success' | 'error'; message: string }) => void;
}
```

URL: `?page=<positive int>` — invalid/missing → 1; out-of-range → clamp + rewrite.

### Error handling

- Boot failure → `/login?next=` (unchanged).
- Refetch failure → keep prior `accessibles`, stay ready, no login bounce.
- Bad `?page=` → degrade; no crash.
- Missing `onNotify` → no-op.
- Never put `item` / `accessibles` identity in `RemoteOutlet` effect deps.

### Testing

- SDK 44 tests green; shell/admin typecheck+build; `make smoke`.
- Browser evidence for each global success criterion in the plan (or mark unverified).
- `node scripts/e2e-demo-remote.mjs` runnable after puppeteer declared.
- No new Playwright suite / coverage gate this phase.

---

## 5. Success metrics

Mirror plan global criteria (unchecked until executed):

- [ ] Deep-link `/app/admin/users` after refresh
- [ ] MfeConfig mutate → nav updates after focus/visibility; no remount / lost form input
- [ ] `?page=2` shareable + refresh + history on users, scopes, configs
- [ ] `onNotify` → Snackbar without shell imports in remote
- [ ] Guarantee #8 amended in CLAUDE + system-architecture + frontend satellite
- [ ] Root `package.json` + puppeteer; e2e script runs; “no root package.json” docs fixed
- [ ] 0 broken relative links (8 known fe-libs links fixed)
- [ ] No token storage writes; smoke + SDK tests green

---

## 6. Risks & mitigations

Delegated to plan §Risks. Highest: refetch remount (string deps); `onNotify` drift toward event bus (one typed callback only); root `package.json` accidentally becoming a workspace (forbid `workspaces`).

---

## 7. Implementation considerations

- **Do not re-plan from scratch** — execute `plans/260913-2241-cross-remote-state/` phases in order (P1 verify alone → P2∥P3 → P4 → P5).
- P1 may already be satisfied in HEAD; still record before/after evidence.
- Amend non-goal docs only where guarantee #8 / root package.json assertions change — surgical edits.
- Next roadmap candidates after this closes: D1+D2 Vue, or Phase E MinIO — separate brainstorm cycles.

---

## 8. Next steps

1. ~~User review gate on this spec.~~ Done.
2. ~~`/plan` refresh~~ — plan refreshed 2026-09-14 (same folder; no duplicate phases).
3. Execute: `/cook --auto` on the plan path; tick criteria with evidence.
4. SDK store / zustand-like sharing — **out of scope**; separate brainstorm if revisited.

---

**Document version:** 1.0  
**Brainstorm approvals:** next-phase A · full scope A · refetch A · approach 1 · design §§1–4 yes (2026-09-14)
