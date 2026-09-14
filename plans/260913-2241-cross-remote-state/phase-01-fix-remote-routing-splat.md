# Phase 1 — Fix remote routing (splat)

## Context Links

- `shell/src/App.tsx:19-29` — shell router
- `remotes/admin-react/src/AdminApp.tsx:27-49` — remote's own `BrowserRouter basename={basePath}`
- `shell/src/pages/RemoteOutlet.tsx:37` — `useParams<{ routeName: string }>()`
- `plans/260913-2113-admin-remote-ui/plan.md:101` — unticked deep-link criterion

## Overview

- **Priority:** P1 (blocker for Phase 3)
- **Status:** pending — **verify-first** (splat may already be in HEAD)
- **Effort:** 0.5h
- **Risk:** low change, high blast radius if wrong
- **Spec:** `docs/brainstorm/2026-09-14-cross-remote-state-spec.md`

As of 2026-09-14, `shell/src/App.tsx` already contains `path=":routeName/*"`. This phase **verifies** deep-link behaviour and only edits the route if the splat is missing or wrong. Historically, without a splat, `/app/admin/users` matched the catch-all → `NotFound` on refresh.

## Key Insights

- `path=":routeName"` matches **exactly one** segment; `/admin/users` is two → falls through to `path="*"`.
- The remote owns its sub-routes (`BrowserRouter basename="/app/admin"`), so the shell must match a **prefix**, not a single segment.
- In-session navigation appears to work only because remote `pushState` does **not** emit `popstate`, so the shell router never re-evaluates. The bug therefore shows up on **refresh / deep-link**, not on click-through.
- `RemoteOutlet` already handles an unknown `routeName` itself (`item` undefined → `<NotFound routeName=…>`), so widening the match does not weaken 404 behaviour.

## Requirements

- Deep-link and hard refresh on any remote sub-route must render that remote.
- Unknown top-level route (`/app/nope`) must still render `NotFound`.
- No change to the remote contract; no change to remote source.

## Related Code Files

**Modify**
- `shell/src/App.tsx` — route path

**Verify only (no edit expected)**
- `shell/src/pages/RemoteOutlet.tsx` — `useParams` must still resolve `routeName` with a splat
- `shell/src/pages/NotFound.tsx`

## Implementation Steps

1. Confirm current route in `shell/src/App.tsx`: expect `path=":routeName/*"`. If missing, apply the change below.
2. **Browser verify** (required even if splat already present): `make up`, log in as `admin@example.com` / `12345678`, open `/app/admin/users`, **hard refresh**. Record result.
3. If splat was missing:
   ```tsx
   <Route path=":routeName/*" element={<RemoteOutlet />} />
   ```
4. Confirm `useParams<{ routeName: string }>()` still returns `admin` for `/app/admin/users`.
5. Re-test: refresh on `/app/admin/users`, `/app/admin/configs`, and a detail path if present.
6. Re-test 404s: `/app/nope` → shell `NotFound`; `/app/admin/nope` → remote's own `*` handling.
7. Confirm `/app/demo` still mounts.

## Todo List

- [x] Confirm splat present in `App.tsx` (or add it)
- [ ] Browser: hard refresh `/app/admin/users` → admin Users (record evidence) — **unverified** (no Docker)
- [x] Verify `useParams` still resolves `routeName`
- [ ] Re-test `/app/nope` → NotFound — **unverified**
- [ ] Re-test `/app/demo` unaffected — **unverified**

## Actual Outcome

**Code verification:** Splat **confirmed present** in `shell/src/App.tsx:25` as `path=":routeName/*"`. No change needed. `useParams<{ routeName: string }>()` in `RemoteOutlet.tsx:37` still resolves correctly (context links verified).

**Browser evidence:** UNVERIFIED. Docker unavailable; hard refresh deep-link tests not executed. Criteria depend on Phase 1 browser check passing; recommend re-test in Phase 5 when full-stack is running.

## Success Criteria

- Hard refresh on `/app/admin/users` renders the admin Users page.
- `/app/nope` still renders `NotFound`.
- No source change in any remote.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Splat changes `routeName` parsing | Step 3 asserts it before/after; `useParams` behaviour is documented |
| Some other shell code assumes one-segment match | `grep -rn "useParams" shell/src` and check each hit |
| Fix masks a deeper router-conflict bug | Two routers on one history remains true; document in Phase 5, do not try to unify here |

## Security Considerations

None. Route matching only; no auth or token surface. Ensure the widened route does **not** bypass `Gate` — the splat stays inside `<Gate>` (`App.tsx:20`).

## Next Steps

Unblocks Phase 3 (URL-as-state) and makes the admin plan's line-101 criterion satisfiable.
