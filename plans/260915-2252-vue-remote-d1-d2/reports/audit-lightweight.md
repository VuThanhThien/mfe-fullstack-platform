# Plan audit (lightweight) — Vue Remote D1–D2

**Plan:** `plans/260915-2252-vue-remote-d1-d2/`  
**Date:** 2026-09-15  
**Mode:** parallel — full hostile multi-agent audit skipped (researcher model limit); self-audit below.

## Hostile checks

| Attack | Finding | Disposition |
|--------|---------|-------------|
| Seed before shell = dead nav | Real | Plan documents ship P1+P4 same window; nav already unfiltered |
| Compose Dockerfile missing | Real | P2↔P3 coordinate; land together |
| `@mfe/ui` in Vue Docker | Avoided | Thin theme bridge — correct |
| Tailwind vs MUI clash | Residual risk | P5 mitigation; accept visual QA |
| Deep-link Vue tabs | Out of scope | Memory router locked — OK |
| Effort 7h roadmap vs 15h | Honest | Plan uses 15h |
| Second Vue remote / shell shared.vue | Deferred | Documented |
| Standalone cookie on :5177 | Accepted Mode C | Documented DX = shell |

## Gaps fixed in plan already

- Exclusive ownership P3→P5 serialize
- No axios / mount contract unchanged
- Smoke JSON check for demo-vue

## Residual (accept)

- No automated Vue component tests this phase
- Tailwind global leak possible
- Audit agents not re-run

**Verdict:** Plan executable; proceed to cook with eyes on P3 MF stub and P5 style clash.
