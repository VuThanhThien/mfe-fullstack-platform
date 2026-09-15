---
title: "Remote Standalone Auth + Multi-Surface"
description: "Dual-mode remote/landing SessionGate + COOKIE_DOMAIN; then product/article multi-expose proof."
status: completed
priority: P1
effort: 14h
branch: master
tags: [feature, auth, mfe, frontend, backend]
created: 2026-09-15
spec: docs/brainstorm/2026-09-15-remote-standalone-auth-spec.md
---

# Remote Standalone Auth + Multi-Surface

**Spec A (approved):** [`docs/brainstorm/2026-09-15-remote-standalone-auth-spec.md`](../../docs/brainstorm/2026-09-15-remote-standalone-auth-spec.md)  
**Spec B (approved):** [`docs/brainstorm/2026-09-15-multi-surface-remote-spec.md`](../../docs/brainstorm/2026-09-15-multi-surface-remote-spec.md)  
**Order:** **A then B** (user-locked).

## Goal

1. **Spec A** — Team chạy `backend` + landing **hoặc** remote **không cần shell**; SessionGate + shared `LoginForm` trong `@mfe/ui`; optional `COOKIE_DOMAIN` cho prod SSO; hosted `mount` không hiện login.
2. **Spec B** — Hybrid multi-surface: nested category trong Product; thêm expose `./Article` + `MfeConfig` `article`; seed `productReact` / `product` / `article`.

## Problem (verified)

- Remote/landing `main` không `refresh()`/`login` → không standalone.
- Cookie không có `Domain` → chưa sẵn prod subdomain SSO.
- `safeNext` / 401 → chỉ `/app…` + landing `/login` — lệch standalone same-origin.
- Một expose `./App` + seed `demo` — chưa chứng minh multi-`MfeConfig` cùng bundle.

## Decisions (locked)

| # | Decision |
|---|----------|
| 1 | Dual-mode: `expose` = no SessionGate; standalone entry = SessionGate |
| 2 | Login UI in `@mfe/ui` (no axios); apps wire `@mfe/sdk` |
| 3 | Local: Vite `/api` proxy; `COOKIE_DOMAIN` unset |
| 4 | Prod: `COOKIE_DOMAIN=.platform.tld`; `make up` `:8080` giữ |
| 5 | Hybrid multi-surface; split khi scope **hoặc** nav/`routeName` riêng |
| 6 | No `bundleId`; same `remoteName` = bundle |
| 7 | Naming product/category/article; folder `demo-react` rename optional |
| 8 | Standalone = primary Product tree only |

## Constraints

1. Access memory-only; refresh HttpOnly; no `localStorage` / `?token=`.
2. Mount ctx unchanged (no token).
3. axios only in `@mfe/sdk`.
4. Do not break shell Gate / `accessible` / `make smoke` path-based gateway.
5. Pin `@module-federation/vite@1.16.6`.
6. Do not edit other brainstorm files except status already set on A/B specs.

## Execution strategy

```
P1 cookie ──┬── P2 @mfe/ui LoginForm ──┬── P4 demo-react standalone ──┐
            └── P3 SDK redirect ───────┘         ∥                    ├── P6 Spec B multi-expose
                                                 P5 landing LoginForm ─┘
                                                                         └── P7 verify + docs
```

- **P1 first** (backend).
- **P2 ∥ P3** after P1.
- **P4** needs P2+P3; **P5 ∥ P4** after P2 (P5 soft-dep P3 for redirect consistency).
- **P6** after P4 (reuse Product tree / dual entry).
- **P7** last.

## File ownership (exclusive)

| Phase | Owns | Must not touch |
|-------|------|----------------|
| 1 | `backend/src/api/auth/**`, `backend/.env.example`, auth unit/e2e cookie tests | FE apps |
| 2 | `packages/mfe-ui/**` (LoginForm, SessionGate, schemas, tests, README) | SDK http, remotes business routes |
| 3 | `packages/mfe-sdk/src/next.ts`, `http.ts`, related specs, README redirect section | `@mfe/ui`, remotes UI |
| 4 | `remotes/demo-react/**` (standalone, vite proxy, README) — **pre-B** may still use DemoApp | landing, seeder product rename |
| 5 | `landing/src/pages/Login.tsx`, landing schemas/deps, landing vite proxy if needed | remotes |
| 6 | demo-react exposes/Product/Article, nested routes, seeder, e2e script, gateway path notes, `docs/code-standards-frontend.md` hybrid blurb | `@mfe/ui` LoginForm API |
| 7 | `docs/local-development-guide.md`, `CLAUDE.md`, `system-architecture.md`, optional admin dual-entry stub | product feature pages beyond docs |

> P4 vs P6 both touch `remotes/demo-react` — **serialize**: P4 then P6.

## Phases

| # | Phase | Effort | Link |
|---|-------|--------|------|
| 1 | Backend `COOKIE_DOMAIN` | 1.5h | [phase-01](./phase-01-backend-cookie-domain.md) |
| 2 | `@mfe/ui` LoginForm + SessionGate | 2.5h | [phase-02](./phase-02-mfe-ui-login-session-gate.md) |
| 3 | SDK standalone redirect | 1.5h | [phase-03](./phase-03-sdk-standalone-redirect.md) |
| 4 | demo-react standalone SessionGate | 2.5h | [phase-04](./phase-04-demo-react-standalone-auth.md) |
| 5 | Landing adopts LoginForm | 1.5h | [phase-05](./phase-05-landing-login-form.md) |
| 6 | Spec B multi-surface product/article | 3h | [phase-06](./phase-06-multi-surface-product-article.md) |
| 7 | Verify + docs sync | 1.5h | [phase-07](./phase-07-verify-and-docs.md) |

**Total ≈ 14h.**

## Risks

| Risk | Mitigation |
|------|------------|
| CORS when Vite → Nest without gateway | Extend `APP_CORS_ORIGIN` for `:5175`/`:5173`; prefer proxy so browser same-origin |
| 401 redirect breaks shell | Keep `safeNext` for shell; new helper / mode for standalone |
| Seed rename orphans `demo` nav | Prefer replace/remove `demo` row; update e2e |
| P4→P6 churn in demo-react | P4 minimal SessionGate on current tree; P6 renames to Product |

## Success criteria

- [x] Backend + demo-react **only**: login → authenticated API; no shell
- [x] Hosted mount: no LoginForm
- [x] `COOKIE_DOMAIN` empty → no Domain; set → Domain on set/clear
- [x] Nav: Products + Articles (`productReact`); category nested under product
- [x] No access token in web storage
- [x] Docs: local vs prod env table + hybrid remote rules

## Cook

```bash
/cook /Users/vuthanhthien/Documents/Coding/personal/micro-frontend-fullstack-2026/plans/260915-1117-remote-standalone-multi-surface/plan.md
```

Use `--parallel` only for P2∥P3 (and P5∥P4 after P2) with ownership above.
