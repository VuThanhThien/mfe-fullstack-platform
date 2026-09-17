---
title: "Docker shared package deps (drop pnpm add)"
description: "Lock @mfe/ui auth runtime deps so FE Dockerfiles use frozen installs only; simplify SyncedMemoryRouter SDK install; no pnpm workspace"
status: complete
priority: P1
effort: 4h
tags: [docker, mfe-ui, mfe-sdk, devops]
created: 2026-09-17
---

# Docker shared package deps

## Overview

FE Dockerfiles currently install `@mfe/ui` with `--prod` (empty) then mutate the image via `pnpm add --prod` with hard-coded versions. React remotes also double-install `@mfe/sdk` for SyncedMemoryRouter typecheck.

**Goal:** one lockfile-driven install per shared package; no runtime `pnpm add` / `npm install --no-save` peer lists; Vue stays React-free; **no pnpm workspace**.

## Decision

| Choice | Verdict |
|--------|---------|
| **B — lock auth runtime in `@mfe/ui` `dependencies`** | **Do** — `pnpm install --frozen-lockfile --prod` installs them; peers stay for consumer contract; icons/recharts stay peer-only (not in `dependencies`) |
| **A — shared Docker base image** | **Defer** — after B, Dockerfiles are short enough; shared stage adds Bake/`FROM` coupling without enough win for solo monorepo |
| **C — pnpm workspace** | **Out** — conflicts with CLAUDE.md |

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Lock `@mfe/ui` auth runtime deps + lockfile | Complete | 1h | [phase-01](./phase-01-mfe-ui-auth-deps.md) |
| 2 | Clean FE Dockerfiles (sdk/ui install rules) | Complete | 1.5h | [phase-02](./phase-02-dockerfiles.md) |
| 3 | Docs + verify (`make up` / smoke) | Complete | 1h | [phase-03](./phase-03-docs-verify.md) |

## Success criteria

- [x] No `pnpm add` / version-pinned peer lists in any FE Dockerfile
- [x] `landing` uses `npm install --prefix … --omit=dev` only (no `--no-save` peer dump)
- [x] admin/demo-react: **one** SDK install (full, not `--prod` then reinstall)
- [x] shell + landing: SDK `--prod` / omit-dev (axios only)
- [x] demo-vue unchanged (SDK `--prod` only)
- [x] `make up` + `make smoke` green

## Non-goals

- pnpm workspace / root workspaces
- Docker Bake / shared base image (deferred)
- Publishing `@mfe/*` to npm
- Changing federation `shared` config
- Installing `@mui/icons-material` into Docker UI tree (keep out of UI `dependencies`)

## Risks

| Risk | Mitigation |
|------|------------|
| Dual dep+peer for react/MUI confuses consumers | Keep peer ranges; document that `dependencies` are for package-local/`file:` Docker installs |
| Full SDK install pulls vitest/eslint into React remote builder | Acceptable — production stage copies `dist` only; final Caddy image unchanged |
| Lockfile churn in `packages/mfe-ui` | Run `pnpm install` once in package; commit lockfile |

## Cook

```bash
/cook /Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/plans/260917-0955-docker-shared-package-deps/plan.md
```
