# Phase 7 — Verify + docs sync

## Context Links

- Spec A §8 success metrics; Spec B §7
- `docs/local-development-guide.md`
- `CLAUDE.md` — architecture guarantees / remote contract
- `docs/system-architecture.md`
- `scripts/e2e-demo-remote.mjs`
- Optional: `remotes/admin-react` dual-entry SessionGate (stub or defer)

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** low

Evidence pass + documentation for local vs prod env; optional admin-react standalone parity note.

## Requirements

- Docs table: local (backend + app, proxy, no `COOKIE_DOMAIN`) vs prod (`COOKIE_DOMAIN`, dual-mode SPA + shell).
- Update CLAUDE / system-architecture: dual-mode remotes; hybrid multi-expose convention; do not claim demo-only.
- Verification checklist executed (see Acceptance).
- Admin-react: either minimal SessionGate standalone (same as demo pattern) **or** explicit deferral note in plan completion + remote README (“follow product remote pattern”).

## Related Code Files

**Modify**
- `docs/local-development-guide.md`
- `CLAUDE.md`
- `docs/system-architecture.md`
- Spec A/B success checklists (tick in plan or leave for cook evidence)
- Optionally `remotes/admin-react/src/main.tsx` + vite proxy

**Read**
- Gateway Caddyfile — confirm `/r/demo-react` still accurate post-P6

## Implementation Steps

1. Run: backend unit cookie tests; SDK tests; mfe-ui tests; typecheck affected apps.
2. Manual or puppeteer: standalone product remote login; shell mount product + article; storage check.
3. `make smoke` if stack up — expect 200s; adjust paths if needed.
4. Write docs env split + hybrid rules cross-links to specs.
5. Decide admin dual-entry: implement thin or document defer.

## Tests / evidence

- Checklist in plan.md Success criteria all checked with notes.
- No access token in web storage (browser check).

## Acceptance

- [x] All plan.md success criteria evidenced
- [x] Local-dev guide documents backend-only workflows
- [x] CLAUDE/architecture mention dual-mode + multi-surface convention
- [x] Admin follow-up done or explicitly deferred

## Risks

- Doc drift with still-named `demo-react` folder — state mapping `productReact` ↔ `/r/demo-react` clearly.
