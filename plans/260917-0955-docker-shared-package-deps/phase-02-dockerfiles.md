# Phase 02 — Clean FE Dockerfiles

**Priority:** P1  
**Status:** Complete  
**Effort:** 1.5h  
**Owns:** `shell/Dockerfile`, `landing/Dockerfile`, `remotes/admin-react/Dockerfile`, `remotes/demo-react/Dockerfile`  
**Blocked by:** Phase 01  
**Does not own:** `remotes/demo-vue/Dockerfile` (leave as-is unless a one-line comment help)

## Overview

Replace mutated peer installs with frozen package installs. Align SDK install with whether the app typechecks `@mfe/sdk/react-router`.

## Target install rules

| App | `@mfe/sdk` | `@mfe/ui` |
|-----|------------|-----------|
| landing | `npm install --prefix … --omit=dev` (axios) | `npm install --prefix … --omit=dev` (auth deps from P1) |
| shell | `pnpm install --frozen-lockfile --prod` | `pnpm install --frozen-lockfile --prod` |
| admin-react | **one** `pnpm install --frozen-lockfile` (full — SyncedMemoryRouter) | `pnpm install --frozen-lockfile --prod` |
| demo-react | same as admin | same as admin |
| demo-vue | `--prod` only (unchanged) | N/A |

## Requirements

1. Remove all `pnpm add --prod …` chains from shell/admin/demo-react.
2. Remove landing’s `--no-save` peer package list; use omit-dev for both packages after `rm -rf node_modules`.
3. admin/demo-react: delete the post-app “reinstall SDK full” step; instead install SDK **full** once before app install (or once after COPY sdk — single RUN). Order must leave `packages/mfe-sdk/node_modules` with react peers when `tsc` path-maps into sources — verify build; if app `pnpm install` wipes SDK node_modules again, keep a **single** post-app `pnpm install --frozen-lockfile` in the SDK (no prior `--prod`).
4. Short comments explaining why SDK is full vs prod.
5. Do not introduce a shared base image in this phase.

## Related files

**Modify**

- `shell/Dockerfile`
- `landing/Dockerfile`
- `remotes/admin-react/Dockerfile`
- `remotes/demo-react/Dockerfile`

## Implementation steps

1. [ ] shell: UI `--prod` only; drop `pnpm add`.
2. [ ] landing: dual omit-dev; drop peer dump.
3. [ ] admin + demo-react: simplify SDK to one full install; UI `--prod` only; drop post-hoc hacks that duplicate installs.
4. [ ] Local dry-build optional: `docker build -f remotes/admin-react/Dockerfile .` (if disk allows).

## Target snippet (admin)

```dockerfile
COPY packages/mfe-sdk /workspace/packages/mfe-sdk
# Full install: tsc path-maps SyncedMemoryRouter → needs React peers in this tree.
RUN cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile

COPY packages/mfe-ui /workspace/packages/mfe-ui
RUN cd /workspace/packages/mfe-ui && pnpm install --frozen-lockfile --prod

# … app package.json + pnpm install --frozen-lockfile …
# If SDK node_modules wiped by app link install, re-run ONE:
# RUN cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile
```

## Risks

| Risk | Mitigation |
|------|------------|
| App install clears SDK node_modules | Re-verify; keep one post-app full SDK install if needed (still no `pnpm add`) |
| Landing npm omit-dev on mfe-ui after P1 | Depends on npm reading `dependencies`; no lockfile in package — same as today’s axios pattern |

## Success criteria

- [ ] Zero `pnpm add` in FE Dockerfiles
- [ ] Zero hard-coded peer version lists in Dockerfiles
- [ ] admin/demo-react `pnpm build` in image succeeds
