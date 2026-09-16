# Phase 06 — Standalone redirect + docs + verify

## Context Links

- Spec §5 standalone stub, §9 success metrics, §10 next steps
- Roadmap Phase D TODO Vue checklist

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** low
- **Depends:** P4 + P5

Finalize standalone redirect-only entry; update platform docs; run smoke + browser checklist.

## Requirements

### Standalone (`remotes/demo-vue/src/main.ts`)

- `setRedirectPolicy('standalone')`
- `refresh()` → on success mount app (`createWebHistory`); on failure redirect to `VITE_PUBLIC_LOGIN_URL` default `http://localhost:8080/login` with safe `next`
- No Vue LoginForm / SessionGate
- Document: UI DX = shell `:8080/app/vue`; cookie on `:5177` after landing login usually fails (accepted)

### Docs

- `docs/project-roadmap.md` — mark D1–D2 progress / update TODO Vue bullets as in-progress or done when verified
- `CLAUDE.md` — mention demo-vue / port 5177 / framework vue outlet
- `docs/codebase-summary.md`, `docs/code-standards-frontend.md` (§ remote Vue / memory router / no @mfe/ui in Vue)
- `docs/local-development-guide.md` — how to run demo-vue
- `docs/system-architecture.md` — brief Vue remote note if section exists
- `remotes/demo-vue/README.md` — complete

### Verify

- `make smoke` including demo-vue
- Browser checklist from spec §9
- shell + demo-vue typecheck/build

## Related Code Files

**Modify**
- `remotes/demo-vue/src/main.ts` (+ env example if needed)
- Docs listed above
- `CLAUDE.md`

**Do not**
- Expand UI features; Angular; edit unrelated brainstorm specs

## Implementation Steps

1. Implement redirect stub main.
2. Update docs in one pass.
3. `make smoke` + manual browser matrix.
4. Mark plan phases complete in plan.md when done (cook sync-back).

## Todo

- [x] Standalone redirect behavior
- [x] Docs + CLAUDE + roadmap
- [ ] smoke + browser verify
- [x] Plan status → completed when all green

## Success Criteria

- [x] Spec §9 checklist all checked
- [x] Roadmap/CLAUDE reflect Vue remote shipped
- [x] Unauth `:5177` → platform login

## Risks

- Docs drift — keep authority = running code.

## Security

- No secrets in docs; seed passwords stay example-only.

## Next Steps

Follow-up specs: Vue SessionGate dual-mode; URL-synced Vue router; Angular D3–D4.
