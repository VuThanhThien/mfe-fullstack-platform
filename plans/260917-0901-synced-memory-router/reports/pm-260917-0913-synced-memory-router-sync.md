# Plan sync: Synced Memory Router

**Date:** 2026-09-17 09:13  
**Plan:** `plans/260917-0901-synced-memory-router/`  
**Frontmatter:** `status: completed`  
**Phases:** 5/5 Complete

## Roll-up

| Criterion | Status |
|-----------|--------|
| SDK `@mfe/sdk/react-router` + location-sync tests | [x] 60 unit tests, typecheck green |
| demo-react local router removed; admin on SyncedMemoryRouter | [x] grep: no local file; no BrowserRouter in admin `src/` |
| Shell nav admin subpath without refresh | [ ] not e2e-verified |
| Standards + READMEs MUST/MUST NOT | [x] §2.3.2 frontend + SDK tree |
| typecheck touched apps | [x] sdk, demo-react, admin-react, shell |
| e2e `e2e-shell-nav-click.mjs` | [ ] skipped — Puppeteer Chrome missing in env |

## Phase todo counts (sync pass)

| Phase | Impl | Open (env/manual) |
|-------|------|-------------------|
| P1 | 6/6 | — |
| P2 | 4/4 | — |
| P3 | 3/5 | manual AC ×2 (e2e proxy) |
| P4 | 4/4 | e2e checkbox open |
| P5 | docs 4/4 + verify partial | e2e + manual |

## Verify evidence (this pass)

```text
packages/mfe-sdk:  pnpm test → 60 passed; pnpm typecheck → OK
demo-react:        pnpm typecheck → OK
admin-react:       pnpm typecheck → OK
shell:             pnpm typecheck → OK
e2e-shell-nav-click: NOT RUN (Puppeteer Chrome)
```

## Follow-up

- Run `node scripts/e2e-shell-nav-click.mjs` with stack up + Chrome for Puppeteer; then tick plan roll-up e2e + P3/P4 open items.
- Optional: Vue URL sync (out of scope this plan).

## Unresolved

- None for plan closure; e2e is explicit debt, not blocking `status: completed` per user directive.
