# Hướng dẫn phát triển local

**Ngày:** 2026-09-16  
**Đối tượng:** Developer chạy full stack hoặc backend + một app (Spec A standalone)  
**Authority:** `docker-compose.yml`, `Makefile`, `.env.example` (root), `.dev-bin/env.sh`, `backend/.env.example`, `gateway/Caddyfile*`, seeders trong `backend/src/database/seeds/`

Chi tiết từng app nằm ở README của package (mục **Local development**). File này là **hub** — chọn workflow, ports, env, quality, rồi nhảy vào app cần làm.

---

## 1. Chọn workflow

| Workflow | Khi nào dùng | Browser | FE mode |
|----------|--------------|---------|---------|
| **`make up`** | Smoke full stack, demo end-to-end | `http://localhost:8080` | Production static trong Docker (**không** HMR) |
| **Hybrid** | Edit-reload DX | `:8080` qua Caddy host (khuyến nghị) hoặc Vite trực tiếp | Vite HMR trên host |
| **Spec A standalone** | Team remote/landing không cần shell | `http://localhost:517x` | Vite + `/api` proxy; SessionGate trong app |

| Concern | Local (team) | Prod / `make up` |
|---------|--------------|------------------|
| API | Vite `server.proxy['/api']` → Nest `:3000` | Caddy `/api*` → backend |
| `COOKIE_DOMAIN` | **Unset** (host-only cookie) | `.platform.tld` (SSO) |
| Remote auth | Standalone SessionGate + LoginForm | Shell `Gate` khi hosted |

Specs: [standalone auth](./brainstorm/2026-09-15-remote-standalone-auth-spec.md), [multi-surface](./brainstorm/2026-09-15-multi-surface-remote-spec.md), [FE §2.8.1](./code-standards-frontend.md).

---

## 2. Toolchain

| Tool | Version |
|------|---------|
| Node.js | **20.18.0** |
| pnpm | **9.12.3** (qua `.dev-bin/env.sh`) |
| Docker + Compose | mới gần đây |
| Caddy | 2.x (chỉ khi hybrid qua `:8080`) |

```bash
. .dev-bin/env.sh   # Node 20.18.0 + pnpm 9.12.3
node -v && pnpm -v
```

**Package manager theo app:** `landing/` dùng **npm**; mọi app/package còn lại dùng **pnpm**. Root `package.json` chỉ chứa tooling repo (husky, commitlint, lint-staged, e2e) — **không** có workspaces.

Git hooks (Husky) cài khi `pnpm install` ở **root** (`prepare` → husky).

---

## 3. Port & origin map

| Service | Port host | Qua Caddy `:8080` |
|---------|-----------|-------------------|
| Caddy | `8080` | — |
| NestJS backend | `3000` | `/api*` |
| Landing | `5173` | `/` |
| Shell | `5174` | `/app*` |
| Product remote (`demo-react`) | `5175` | `/r/demo-react*` |
| Admin remote | `5176` | `/r/admin-react*` |
| Vue remote | `5177` | `/r/demo-vue*` |
| Postgres (`make infra`) | `25432` → container `5432` | — |
| Redis | `6379` | — |

`make up` không publish Postgres ra host; backend trong compose dùng `DATABASE_HOST=db:5432`.

**CORS (Spec A):** `APP_CORS_ORIGIN` trong `backend/.env` phải gồm mọi origin Vite bạn mở trực tiếp, ví dụ:

`http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:8080`

---

## 4. Env inventory

| File | Dùng cho |
|------|----------|
| Root `.env` (từ `.env.example`) | Compose / Make ports |
| `backend/.env` (từ `backend/.env.example`) | Nest trên host + migrate/seed |
| `backend/.env.test` | Jest e2e backend |
| FE apps | **Không** bắt buộc `.env.local` — API relative `/api/...` |

Để `COOKIE_DOMAIN` **trống** khi local.

---

## 5. Make cheat sheet

```bash
make up          # full Docker stack → :8080
make smoke       # curl gateway + mf-manifest JSON
make infra       # chỉ Postgres + Redis (hybrid)
make migrate     # migration trong container backend
make seed
make logs / ps / down / reset
make lint-backend
make test-backend
make help
```

---

## 6. Quality matrix

| Package | typecheck | lint | format | test |
|---------|-----------|------|--------|------|
| `backend/` | (nest build) | ✓ | ✓ | jest + e2e |
| `landing/` | ✓ | ✓ | ✓ | — |
| `shell/` | ✓ | ✓ | ✓ | — |
| `remotes/demo-react/` | ✓ | ✓ | ✓ | — |
| `remotes/admin-react/` | ✓ | ✓ | ✓ | vitest |
| `remotes/demo-vue/` | ✓ (`vue-tsc`) | ✓ | ✓ | — |
| `packages/mfe-sdk/` | ✓ | ✓ | ✓ | vitest (~51) |
| `packages/mfe-ui/` | ✓ | ✓ | ✓ | vitest |

Chạy trong từng package: `pnpm lint` / `pnpm format` / `pnpm format:check` (landing: `npm run …`).

---

## 7. Git hooks (root)

Sau `pnpm install` ở root:

| Hook | Việc |
|------|------|
| **pre-commit** | `lint-staged` — eslint `--fix` + prettier `--write` theo package chứa file staged |
| **commit-msg** | commitlint — [Conventional Commits](https://www.conventionalcommits.org/) |

Config: `commitlint.config.mjs`, `lint-staged.config.mjs`, `.husky/`. Backend **không** còn husky riêng.

Ví dụ message hợp lệ: `feat(shell): mount vue remotes`, `docs: refresh local DX hub`.

---

## 8. Smoke nhanh

**Docker:**

```bash
make up && make smoke
# mở http://localhost:8080
```

| Seed user | Password | Scope |
|-----------|----------|-------|
| `dashboard@example.com` | `12345678` | `DASHBOARD` → Products, Articles, Vue |
| `admin@example.com` | `12345678` | `ADMIN` → Admin |

**Hybrid tối thiểu (Spec A):**

```bash
. .dev-bin/env.sh
make infra
cd backend && cp .env.example .env && pnpm install && pnpm migration:up && pnpm seed:run && pnpm start:dev
# rồi một app FE — xem index bên dưới
```

**Troubleshooting ngắn:**

| Triệu chứng | Hướng xử lý |
|-------------|-------------|
| Manifest HTML thay vì JSON | Remote chưa lên — `make smoke` sẽ báo |
| CORS trên `:517x` | Bổ sung origin vào `APP_CORS_ORIGIN` |
| Cookie / SSO lạ | Xóa `COOKIE_DOMAIN` local |
| Empty launcher / empty app drawer after `make up` | Existing volume missed a new migration/seed — `make migrate` then `make seed` |
| Hook không chạy | `pnpm install` ở **root**, kiểm tra `.husky/` |

Chi tiết gateway: [gateway/README.md](../gateway/README.md).

---

## 9. Per-app index (Local development)

| App | README |
|-----|--------|
| Backend | [backend/README.md](../backend/README.md#local-development) |
| Landing | [landing/README.md](../landing/README.md#local-development) |
| Shell | [shell/README.md](../shell/README.md#local-development) |
| Product remote | [remotes/demo-react/README.md](../remotes/demo-react/README.md#local-development) |
| Admin remote | [remotes/admin-react/README.md](../remotes/admin-react/README.md#local-development) |
| Vue remote | [remotes/demo-vue/README.md](../remotes/demo-vue/README.md#local-development) |
| `@mfe/sdk` | [packages/mfe-sdk/README.md](../packages/mfe-sdk/README.md#local-development) |
| `@mfe/ui` | [packages/mfe-ui/README.md](../packages/mfe-ui/README.md#local-development) |
| Gateway | [gateway/README.md](../gateway/README.md#local-development) |

Cài `packages/mfe-sdk` (và `mfe-ui` nếu React) **trước** các FE app dùng `file:` deps.
