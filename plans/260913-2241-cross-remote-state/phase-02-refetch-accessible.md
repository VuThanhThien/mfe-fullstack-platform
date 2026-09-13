# Phase 2 — Refetch `accessible` (server-state invalidation)

## Context Links

- `shell/src/auth/Gate.tsx:33-71` — boot sequence, `useEffect(..., [])`
- `shell/src/context/RemoteContext.tsx` — `{ userId, accessibles }` + throwing `useRemoteContext()`
- `shell/src/pages/RemoteOutlet.tsx:112` — effect deps (must stay string-based)
- `packages/mfe-sdk/src/remote.ts:73-76` — `registerRemotes(..., { force: true })`
- `backend/src/api/mfe-config/mfe-config.service.ts` — `findAccessible` re-reads scopes from DB per call

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Risk:** medium — easy to accidentally remount the live remote

`accessibles` is captured once at boot, so an `MfeConfig` created or edited in `admin-react` never reaches the shell nav until a full reload. Fix by exposing a refetch and triggering it on cheap, reliable signals.

## Key Insights

- The backend **already** returns fresh data per call (`accessible` re-reads the user's scopes from the DB), so this is purely a client cache-invalidation gap — no API change needed.
- `registerRemotes` is already called with `{ force: true }`, so re-registering after a refetch correctly picks up new/removed remotes.
- `RemoteOutlet`'s effect deps are `[item.routeName, item.remoteEntry, retryKey]` — **strings**. A new `accessibles` array identity therefore does **not** remount the mounted remote. This property must be preserved; putting the `item` object in deps would remount on every refetch and destroy in-progress form input.
- `pushState` from a remote does **not** notify the shell router, so route-change is an unreliable trigger on its own; `focus`/`visibilitychange` are the dependable ones.

## Requirements

- Expose `refreshAccessibles()` (and `isRefreshing`) through `RemoteContext`.
- Refetch on: `window` focus, and `visibilitychange` → visible.
- Never downgrade `status` from `'ready'` during a refetch (no flicker, no unmount).
- Dedupe overlapping refetches (one in-flight request).
- On refetch failure: keep the previous `accessibles` and stay usable (do not bounce to `/login` — the boot path already owns that).

## Architecture

```
focus / visibilitychange
        │
        ▼
 refreshAccessibles()  ──dedupe──▶  api.get('/api/v1/mfe-configs/accessible')
        │                                    │
        │                                    ▼
        │                          registerRemotes(items, {force:true})
        ▼                                    │
 setState({status:'ready', accessibles})  ◀──┘
        │
        ▼
 ShellLayout nav + RemoteOutlet re-render (no remount)
```

## Related Code Files

**Modify**
- `shell/src/context/RemoteContext.tsx` — extend `RemoteContextValue`
- `shell/src/auth/Gate.tsx` — extract loader, add triggers

**Read/verify**
- `shell/src/pages/RemoteOutlet.tsx` — confirm deps unchanged
- `shell/src/layout/ShellLayout.tsx:40` — consumer of `accessibles`

## Implementation Steps

1. Extend the context value:
   ```ts
   export interface RemoteContextValue {
     userId: string;
     accessibles: MfeAccessibleItem[];
     refreshAccessibles: () => Promise<void>;   // NEW
     isRefreshing: boolean;                     // NEW
   }
   ```
2. In `Gate.tsx`, extract the loader so boot and refetch share one path:
   ```ts
   const loadAccessibles = useCallback(async () => {
     const { data: items } = await api.get<MfeAccessibleItem[]>(
       '/api/v1/mfe-configs/accessible',
     );
     await registerRemotes(items);              // already {force:true} inside
     setState((s) => (s.status === 'ready'
       ? { ...s, accessibles: items }
       : s));                                    // never leave 'ready'
     return items;
   }, []);
   ```
3. Dedupe with an in-flight ref:
   ```ts
   const inFlight = useRef<Promise<unknown> | null>(null);
   const refreshAccessibles = useCallback(() => {
     if (!inFlight.current) {
       inFlight.current = loadAccessibles()
         .catch(() => { /* keep previous list */ })
         .finally(() => { inFlight.current = null; });
     }
     return inFlight.current as Promise<void>;
   }, [loadAccessibles]);
   ```
4. Wire triggers inside `Gate` (after `status === 'ready'`):
   ```ts
   useEffect(() => {
     if (state.status !== 'ready') return;
     const onFocus = () => void refreshAccessibles();
     const onVis = () => { if (document.visibilityState === 'visible') void refreshAccessibles(); };
     window.addEventListener('focus', onFocus);
     document.addEventListener('visibilitychange', onVis);
     return () => {
       window.removeEventListener('focus', onFocus);
       document.removeEventListener('visibilitychange', onVis);
     };
   }, [state.status, refreshAccessibles]);
   ```
5. Pass the new fields into `RemoteContext.Provider`.
6. Verify no remount: with the admin Users page open and a half-filled form, trigger a refetch (switch tab and back) and confirm the form content survives.
7. **Do not** add an interval in this phase (see Risks) — revisit only if the focus trigger proves insufficient.

## Todo List

- [ ] Extend `RemoteContextValue` with `refreshAccessibles` + `isRefreshing`
- [ ] Extract shared loader in `Gate.tsx`
- [ ] Add in-flight dedupe
- [ ] Wire `focus` + `visibilitychange` triggers with cleanup
- [ ] Confirm `status` never returns to `'loading'` on refetch
- [ ] Confirm live remote is not remounted (form input survives)
- [ ] Confirm failing refetch keeps the old nav list

## Success Criteria

- Create an `MfeConfig` in admin, switch tabs and return → nav updates **without** reload.
- No visible loading flash; open remote stays mounted.
- Backend down during refetch → nav keeps last known list, no redirect loop.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Refetch remounts the remote and wipes form state | Keep `RemoteOutlet` deps as strings; never add `item` to deps; explicit step 6 check |
| Refetch storm from focus churn | In-flight dedupe; no interval |
| Re-registering remotes disrupts the loaded one | `registerRemotes` only re-registers the MF registry; the mounted module instance is untouched — verify in step 6 |
| `setState` during unmount warnings | Cleanup returned from the effect; `cancelled` flag pattern already used in `Gate` |

## Security Considerations

- No new data exposure: the endpoint is already user-scoped and ADMIN does **not** bypass `accessible`.
- Do not cache `accessibles` to storage — keep the memory-only posture consistent with the token rules.
- Refetch must not log the payload (it contains route/scope metadata).

## Next Steps

Phase 3 covers UI state (URL); Phase 5 records the browser evidence and syncs docs.
