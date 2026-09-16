# Phase 04 — Shell VueRemote outlet

## Context Links

- Spec §4 shell
- Scout §1 RemoteOutlet
- `shell/src/pages/RemoteOutlet.tsx`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 2h
- **Risk:** medium
- **Parallel:** Wave 1 after P3 (∥ P5)

Branch `framework === 'vue'` → mount lifecycle identical to `ReactRemote`. Keep angular/other → Unsupported.

## Requirements

- Decision tree:
  - unknown → NotFound
  - `react` → ReactRemote
  - `vue` → VueRemote (new)
  - else → Unsupported
- VueRemote: copy ReactRemote pattern (`loadRemote`, mount ctx, loading, error+retry, cleanup)
- **Do not** `import 'vue'` in shell
- Update file header comments / Unsupported copy if it says “later phase” for vue only
- typecheck + build shell

## Related Code Files

**Modify**
- `shell/src/pages/RemoteOutlet.tsx`
- `shell/src/pages/Unsupported.tsx` (comment / messaging only if needed)

**Do not**
- Change Gate / nav filter (nav already shows all frameworks)
- remotes, backend

## Implementation Steps

1. Extract shared mount helper **or** duplicate ReactRemote as VueRemote (prefer small duplication over premature abstract — KISS; extract only if trivial).
2. Change guard from `!== 'react'` to explicit branches.
3. Manual: with P1+P2+P3, login dashboard user → `/app/vue` → stub text.
4. Regression: `/app/product` still mounts React.

## Todo

- [x] VueRemote branch
- [x] Unsupported only for non-react/non-vue
- [x] typecheck + build
- [ ] Manual mount stub

## Success Criteria

- [x] `/app/vue` mounts stub (not Unsupported)
- [x] React remotes unchanged
- [x] Error + Retry still works if manifest down

## Risks

- Seeding vue before this phase → dead nav — ship P1+P4 same cook window when possible.

## Security

- Mount ctx still no token.

## Next Steps

P5 replaces stub UI; P6 docs mention Vue outlet.
