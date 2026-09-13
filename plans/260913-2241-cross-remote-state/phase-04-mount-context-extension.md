# Phase 4 — Mount-context extension (guarantee #8 amendment)

> **Approved by the user on 2026-09-13.** This phase amends Architecture Guarantee #8 to allow
> optional `onNotify` / `locale` fields on the mount context. The prohibitions on tokens, a user
> object and a general event bus **still stand**. `CLAUDE.md` + `docs/system-architecture.md`
> must be updated in the same phase — code and docs must not diverge.

## Context Links

- `packages/mfe-sdk/src/types.ts:12-20` — `RemoteModule.mount(el, ctx)`; comment: *"no token or user object is passed"*
- `shell/src/pages/RemoteOutlet.tsx:88-95` — where ctx is constructed and passed
- `remotes/admin-react/src/expose.tsx` — consumes `{ basePath, routeName }`
- `remotes/demo-react/src/expose.tsx` — **ignores ctx** (so additive fields are safe)
- `CLAUDE.md` — Architecture Guarantees #8; `docs/system-architecture.md` §3.5

## Overview

- **Priority:** P2
- **Status:** pending — **approved** 2026-09-13
- **Effort:** 1.5h
- **Risk:** medium (contract change; drift toward an event bus)

Give the shell a **narrow, typed, one-way** way to hand the remote optional context beyond routing, and let the remote report user-facing outcomes (e.g. a mutation result) back for display.

## Key Insights

- `demo-react` ignores ctx and `admin-react` destructures only `basePath`/`routeName`, so **adding optional fields is backward compatible** — no remote breaks, and remote teams migrate at will.
- A single typed callback is **not** an event bus: no publish/subscribe registry, no topic strings, no fan-out. It is one channel the shell owns.
- Guarantee #8 explicitly forbids a **token** and a **user object** in ctx. Both stay forbidden here: a remote that needs identity already reads the shared token through the SDK (precedent: `admin-react/src/lib/jwt-scopes.ts` + `SoftGate`).
- Without this phase, `admin-react` mutations are silent — the user gets no confirmation and the shell nav (Phase 2) is the only feedback.

## Requirements

- Extend ctx **additively**; every new field optional.
- Exactly one callback; typed payload; no generic `emit(event, payload)` shape.
- Do not pass token, user object, scopes, or any credential.
- Update the locked contract documentation in the same phase — code and docs must not diverge.

## Architecture

```
shell (RemoteOutlet)                         remote (expose.tsx)
─────────────────────                        ───────────────────
mount(el, {                                   mount(el, ctx) {
  basePath, routeName,          ───────────▶    const { basePath, onNotify } = ctx;
  locale?,                                      …
  onNotify?                                     onNotify?.({level:'success', message:'User created'})
})                                            }
        ▲                                              │
        └──────────── single typed callback ◀──────────┘
```

## Related Code Files

**Modify**
- `packages/mfe-sdk/src/types.ts` — add `RemoteMountContext`
- `shell/src/pages/RemoteOutlet.tsx` — populate the new optional fields
- `shell/src/layout/ShellLayout.tsx` — host a single Snackbar to surface `onNotify`
- `CLAUDE.md` — amend guarantee #8 wording
- `docs/system-architecture.md` §3.5 / §3.3 — update the contract description
- `docs/code-standards-frontend.md` §2.8 — note the additive ctx fields

**Consume (optional, same phase or follow-up)**
- `remotes/admin-react/src/expose.tsx` + mutation pages — call `onNotify` after create/update/delete

## Implementation Steps

1. Add the type (keep the existing "no token / no user object" comment true):
   ```ts
   export interface RemoteMountContext {
     basePath: string;
     routeName: string;
     /** Optional UI locale hint. */
     locale?: string;
     /** One-way, user-facing feedback. NOT an event bus. */
     onNotify?: (n: { level: 'info' | 'success' | 'error'; message: string }) => void;
   }

   export interface RemoteModule {
     mount(el: HTMLElement, ctx: RemoteMountContext): void | Promise<void>;
     unmount(): void | Promise<void>;
   }
   ```
2. `RemoteOutlet` builds the ctx with the new optional fields (`locale` from a constant or `document.documentElement.lang`; `onNotify` from a shell-owned Snackbar setter).
3. `ShellLayout` renders one MUI `Snackbar` + `Alert`; expose a stable `onNotify` (wrapped in `useCallback`) so remotes do not see a new identity each render.
4. `admin-react`: call `onNotify?.({ level: 'success', message: 'User created' })` after successful mutations, and `level: 'error'` on `ApiError`. Guard with optional chaining so the remote still works standalone (`main.tsx` dev entry passes no ctx).
5. **Amend the documentation in the same commit:**
   - `CLAUDE.md` guarantee #8 → describe the additive optional fields and restate that token/user/event-bus remain forbidden.
   - `docs/system-architecture.md` §3.5 → same.
   > Do not weaken the "no token, no user object" rule; only add the narrow callback.
6. Add a guard note to the code-standards satellite: adding a *second* callback or a topic-based emitter requires a fresh decision — this phase explicitly does not open that door.

## Todo List

- [x] Decision recorded: guarantee #8 amendment approved (2026-09-13)
- [ ] `RemoteMountContext` added to the SDK with optional fields
- [ ] `RemoteOutlet` populates optional fields
- [ ] `ShellLayout` hosts one Snackbar and a stable `onNotify`
- [ ] `admin-react` calls `onNotify` after mutations (optional-chained)
- [ ] `CLAUDE.md` + `docs/system-architecture.md` updated
- [ ] Code-standards note added limiting future ctx growth
- [ ] SDK tests still green (`pnpm test`, 44)

## Success Criteria

- A remote mutation shows user-facing feedback without the remote importing shell code.
- `demo-react` (ignores ctx) and `admin-react` (destructures two fields) both still mount unchanged.
- No token, user object, or second callback in ctx.
- Contract docs match `types.ts` exactly.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Slippery slope to an event bus | One callback, typed, one-way; explicit code-standards note; new callbacks need a new decision |
| `onNotify` identity churn re-renders remotes | Memoize with `useCallback`; ctx passed once at mount anyway |
| Remote no longer works standalone | Optional chaining + no required ctx in the dev entry |
| Docs and code drift | Documentation update is a step in this phase, not a follow-up |

## Security Considerations

- **No credentials in ctx** — this is the main reason the phase is gated. Keep `userId`/`scopes`/token out; remotes derive identity from the shared SDK token.
- `onNotify` messages reach the DOM — remotes must not echo raw server error bodies containing internals; reuse `describeApiError`.
- Snackbar content is untrusted input: React escapes it, but do not render remote-supplied HTML.

## Next Steps

Only after approval. Phase 5 then verifies end-to-end and syncs docs.
