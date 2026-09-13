# Phase 1 — Fix remote routing (splat)

## Context Links

- `shell/src/App.tsx:19-29` — shell router
- `remotes/admin-react/src/AdminApp.tsx:27-49` — remote's own `BrowserRouter basename={basePath}`
- `shell/src/pages/RemoteOutlet.tsx:37` — `useParams<{ routeName: string }>()`
- `plans/260913-2113-admin-remote-ui/plan.md:101` — unticked deep-link criterion

## Overview

- **Priority:** P1 (blocker for Phase 3)
- **Status:** pending
- **Effort:** 0.5h
- **Risk:** low change, high blast radius if wrong

The shell routes `/app/:routeName` with **no splat**, so a remote's sub-route (`/app/admin/users`) matches the catch-all and renders `NotFound` on refresh.

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

1. **Verify the defect first** (do not fix blind): `make up`, log in as `admin@example.com` / `12345678`, open `/app/admin`, navigate to Users, then **hard refresh**. Record whether `NotFound` appears.
2. Change the shell route:
   ```tsx
   // before
   <Route path=":routeName" element={<RemoteOutlet />} />
   // after — remote owns everything below its prefix
   <Route path=":routeName/*" element={<RemoteOutlet />} />
   ```
3. Confirm `useParams<{ routeName: string }>()` still returns `admin` for `/app/admin/users` (splat segment is available separately; `routeName` keeps the first segment).
4. Re-test: refresh on `/app/admin/users`, `/app/admin/configs`, `/app/admin/users/<id>`.
5. Re-test 404s: `/app/nope` → `NotFound`; `/app/admin/nope` → remote's own `*` route (`AdminApp.tsx:48` redirects to `users`).
6. Confirm the demo remote is unaffected: `/app/demo` still mounts (it ignores ctx, `demo-react/src/expose.tsx`).

## Todo List

- [ ] Reproduce NotFound on hard refresh (record before/after)
- [ ] Change route to `:routeName/*`
- [ ] Verify `useParams` still resolves `routeName`
- [ ] Re-test sub-route refresh for admin
- [ ] Re-test `/app/nope` → NotFound
- [ ] Re-test `/app/demo` unaffected

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
