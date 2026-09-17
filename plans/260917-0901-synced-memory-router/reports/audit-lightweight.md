# Adversarial audit (lightweight)

**Plan:** `plans/260917-0901-synced-memory-router/`  
**Date:** 2026-09-17  
**Mode:** parallel — formal Skill audit unavailable; hostile self-review

## Attacks / findings

| # | Attack | Severity | Plan response |
|---|--------|----------|---------------|
| 1 | Putting React in `@mfe/sdk` pollutes Vue imports | High if wrong export | **Mitigated:** subpath `@mfe/sdk/react-router` only; main barrel unchanged |
| 2 | Admin `Navigate` catch-all storms with Memory sync | Med | P3 risks + location-sync same-URL + lastSynced; e2e gate in P5 |
| 3 | P4 before P1 helper export races | Low | P4 blocked by P1; fallback local const |
| 4 | Docs say MUST but landing still BrowserRouter → confusion | Med | P5 explicit landing vs remote table |
| 5 | Forgotten ArticleApp import path | Low | P2 lists Product + Article |
| 6 | No test that shell nav updates admin without remount | Med | P3 manual AC + P5 e2e; consider short puppeteer assert if time |
| 7 | Optional peers not installed in SDK package → typecheck fail | Med | P1 adds peers as **devDependencies** for typecheck/test |
| 8 | Superseding admin brainstorm “BrowserRouter OK” without note | Low | P5 + new brainstorm links; do not edit old brainstorm body |

## Gaps accepted (YAGNI)

- Vue sync deferred
- No Navigation API
- SyncedMemoryRouter RTL test optional if location-sync coverage strong

## Verdict

**Ship plan as written.** Biggest footgun is export shape — do not put SyncedMemoryRouter on main `@mfe/sdk` barrel.
