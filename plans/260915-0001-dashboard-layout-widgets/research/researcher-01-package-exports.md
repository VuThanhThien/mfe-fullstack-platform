# Research: `@mfe/ui` dual exports + peers + Vitest (Vite `file:`)

**Date:** 2026-09-15 · **Scope:** `packages/mfe-ui` for dashboard layout + widgets  
**Authority:** Running `mfe-ui`/`mfe-sdk` package.json, shell Vite config, dashboard spec §4–§7

---

## Executive summary

Keep the **SDK pattern**: no publish build, `exports` → `./src/*.ts`, `files: ["src"]`, Docker bind-mount unchanged. Split **public surface** with a second export `./widgets`; **never re-export widgets from `.`**. Vite only bundles reachable imports — shell importing `@mfe/ui` alone does not pull `recharts` if widgets live under a separate entry and shell never imports it.

Mark **`recharts` optional peer** so pnpm 9 does not force-install it for shell/admin. Demo adds `recharts` in its own `dependencies`. Layout/widgets need **React + MUI peers** (not runtime deps). Vitest: add `@vitejs/plugin-react`, `jsdom`, Testing Library; keep theme/mode tests; widget tests live beside widgets with `recharts` in **devDependencies only**.

---

## Existing repo patterns

| | `@mfe/sdk` | `@mfe/ui` (today) |
|---|-----------|-------------------|
| Entry | `"."` → `./src/index.ts` | Same |
| Build | None (Vite consumers compile TS) | Same |
| Runtime deps | `axios` in `dependencies` | None (peers only) |
| Peers | `@module-federation/enhanced` optional | `@mui/material` only |
| Tests | Vitest `node`, `*.spec.ts` | Same |

Shell already: `server.fs.allow` includes `../packages/mfe-ui`; MF **does not** share `@mfe/ui` (v1). Consumers: `file:../packages/mfe-ui` (shell) or `file:../../packages/mfe-ui` (remotes).

---

## Recommended `src/` layout

```
src/
  index.ts              # theme + mode + layout ONLY (no widgets/*)
  widgets/index.ts      # chart/card widgets; only place that imports recharts
  layout/…
  theme/…
  mode.ts
```

**Hard rule:** `src/index.ts` must not `export * from './widgets/…'`. Prevents accidental shell bundle bloat more reliably than lint alone.

---

## Recommended `package.json` (concrete)

```json
{
  "name": "@mfe/ui",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./widgets": {
      "types": "./src/widgets/index.ts",
      "default": "./src/widgets/index.ts"
    }
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "files": ["src"],
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@mui/material": "^6.0.0",
    "@mui/icons-material": "^6.0.0",
    "recharts": "^2.12.0"
  },
  "peerDependenciesMeta": {
    "recharts": { "optional": true }
  },
  "devDependencies": {
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@mui/icons-material": "^6.1.0",
    "@mui/material": "^6.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0"
  }
}
```

**Consumer deps:**

| App | `@mfe/ui` | `recharts` |
|-----|-----------|------------|
| shell | yes | **no** — import layout from `@mfe/ui` only |
| admin-react | yes | no |
| demo-react | yes | **yes** — `import { … } from '@mfe/ui/widgets'` |

Do **not** put `recharts` in `@mfe/ui` `dependencies` (would install for every consumer via pnpm link semantics).

---

## Why subpath works with Vite `file:`

Vite respects `exports` encapsulation; `./widgets` resolves to source TS like SDK. Demo-only `import '@mfe/ui/widgets'` keeps `recharts` out of shell’s graph. `sideEffects: false` OK if no import-time globals. Spec fallback: single entry + import discipline — subpath preferred.

---

## Vitest + React without affecting shell

- `vitest.config.ts`: `@vitejs/plugin-react`, `environment: 'jsdom'`, `include: ['src/**/*.spec.{ts,tsx}']`.
- `tsconfig.json`: `"jsx": "react-jsx"`, include `*.tsx`.
- Widget specs import locally; `recharts` from package **devDependencies** only. Shell runtime never pulls package devDeps.

**Imports:** shell `@mfe/ui`; demo `@mfe/ui/widgets`. **Docker:** bind-mount unchanged; add `recharts` to demo `package.json` only. **Guardrails:** ban `@mfe/ui/widgets` in shell (lint/grep).

---

## Unresolved questions

1. Exact `recharts` pin — align with reference port version when copying widgets.
2. Whether `@emotion/react` / `@emotion/styled` should be explicit peers (shell already has them; MUI 6 implies them).
3. Export `./widgets/*` deep paths vs single `./widgets` barrel only (recommend barrel v1).
