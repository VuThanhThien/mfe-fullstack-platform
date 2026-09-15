# Phase 4 — demo-react standalone SessionGate

## Context Links

- Spec A §5 dual runtime, §8 testing
- `remotes/demo-react/src/main.tsx` — renders DemoApp **without** auth today
- `remotes/demo-react/src/expose.tsx` — mount only (must stay auth-free)
- `remotes/demo-react/vite.config.ts` — base `/r/demo-react/`, **no `/api` proxy**
- Depends on: P2 LoginForm/SessionGate, P3 redirect registration

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 2.5h
- **Risk:** medium — CORS vs proxy; basename for standalone vs hosted

Make demo-react runnable with **backend only**: SessionGate → LoginForm → app. Keep `expose.tsx` without SessionGate for shell.

> P6 will rename Demo → Product; this phase may keep DemoApp routes to minimize churn, or start Product naming early if cheap — **prefer minimal auth wiring; leave IA rename to P6**.

## Requirements

- Standalone entry (replace or wrap `main.tsx` / `standalone/main.tsx` per Vite `index.html` entry).
- On boot: register SDK standalone redirect (P3); `SessionGate` bootstrap=`refresh`.
- Vite `server.proxy['/api']` → backend (port from env / `3000` or documented infra port).
- Ensure CORS or proxy so cookie + credentialed calls work without gateway.
- `expose.tsx` / hosted path: **no** LoginForm.
- README: `make infra` + `pnpm start:dev` backend + `pnpm dev` remote — no shell.

## Related Code Files

**Modify / create**
- `remotes/demo-react/src/main.tsx` or `src/standalone/main.tsx` + vite input
- `remotes/demo-react/vite.config.ts` — proxy
- `remotes/demo-react/package.json` — dep on `@mfe/ui` if missing
- `remotes/demo-react/README.md`
- Backend `.env` CORS list if proxy not used (`APP_CORS_ORIGIN` + `:5175`)

**Do not**
- Add login inside `expose.tsx`

## Implementation Steps

1. Add Vite proxy `/api` → Nest.
2. Standalone root: ThemeProvider as needed + SessionGate + existing DemoApp (basename suitable for standalone, e.g. `/` or `/app/demo` — document choice; standalone often `basename="/"`).
3. Call SDK redirect registration once at startup.
4. Manual verify: no shell, login, `users/me` or existing demo API call.
5. Sanity: still loads under shell via gateway (expose path).

## Tests

- Manual / puppeteer variant later in P7; at least typecheck + README steps.
- Optional thin unit test N/A for mount.

## Acceptance

- [x] Backend + demo-react only → login → app
- [x] No access token in localStorage/sessionStorage
- [x] Shell mount still works without remote login UI
- [x] README documents local standalone

## Risks

- `base: '/r/demo-react/'` breaks standalone asset paths — may need conditional base for standalone mode (`command === 'serve'` vs federation build) or separate vite config; **resolve explicitly** (common pattern: `base: process.env.STANDALONE ? '/' : '/r/demo-react/'`).
