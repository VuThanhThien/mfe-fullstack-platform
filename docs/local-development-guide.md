# Hướng dẫn chạy project local

**Ngày:** 2026-09-13  
**Đối tượng:** Developer muốn chạy full stack trên máy  
**Authority:** `docker-compose.yml`, `Makefile`, `.env.example` (root), `.dev-bin/env.sh`, `backend/.env.example`, `gateway/Caddyfile*`, seeders trong `backend/src/database/seeds/`

> **Entry point trình duyệt:** chỉ dùng `http://localhost:8080`. Không mở `:3000`, `:5173`, `:5174`, `:5175`, `:5176` trong happy path.

---

## 0. Cách nhanh nhất — Docker full stack

Yêu cầu: **Docker Desktop** (hoặc Engine + Compose v2). Không cần Node/Caddy trên host.

```bash
# Từ root repo
make up          # build + start db, redis, backend, landing, shell, demo-react, admin-react, caddy
make smoke       # curl các route chính
make logs        # theo dõi log
make down        # dừng (giữ volume)
```

Mở **http://localhost:8080**

| Seed user | Password | Scope |
|-----------|----------|-------|
| `dashboard@example.com` | `12345678` | `DASHBOARD` (thấy demo remote) |
| `admin@example.com` | `12345678` | `ADMIN` |

Backend tự `migration:up` + `seed:run` lúc boot (`RUN_MIGRATIONS` / `RUN_SEEDS`).

Các lệnh Makefile hữu ích: `make help`, `make build` / `make rebuild`, `make ps`, `make stop` / `make start`, `make reset` (xoá volume + up lại), `make migrate`, `make seed`, `make infra-down`, `make shell-backend`, `make shell-db`, `make test-backend`, `make lint-backend`.

> **Rebuild sau khi đổi Dockerfile / dependency FE:** Dockerfile FE giờ cài cả dependency riêng của `packages/mfe-sdk` (axios), nên checkout cũ **phải build lại** — dùng `make rebuild` (build `--no-cache` rồi `up -d`).

Tuỳ chọn port/password: copy `.env.example` → `.env` ở root.

> **Lưu ý HMR:** stack Docker dùng polling (`CHOKIDAR_USEPOLLING`). DX edit-reload tốt hơn với **hybrid** (mục 3–6 bên dưới): `make infra` + Vite/Caddy trên host.

---

## 1. Yêu cầu trước khi chạy (hybrid / host)

| Tool | Version | Ghi chú |
|------|---------|---------|
| Node.js | **20.18.0** | `nvm install 20.18.0 && nvm use` |
| pnpm | **9.12.3** | `corepack enable` |
| Workspace toolchain | Node **20.18.0** + pnpm **9.12.3** | `. .dev-bin/env.sh` — pin Node qua nvm + đưa `pnpm` local (`.dev-bin/pnpm`) vào `PATH`; cache giữ trong repo (`.corepack/`, `.pnpm-store/`, ...) |
| Docker + Compose | mới gần đây | Postgres + Redis (`make infra`) |
| Caddy | 2.x | Host: `brew install caddy` |
| Git | bất kỳ | Clone repo |

Kiểm tra nhanh:

```bash
. .dev-bin/env.sh   # toolchain workspace: Node 20.18.0 + pnpm 9.12.3
node -v    # v20.18.0
pnpm -v    # 9.x
docker compose version
caddy version
make help
```

> **Trạng thái repo:** repo hiện **chưa có commit nào** — `git log` rỗng và `git status` liệt kê toàn bộ file là untracked. Đây là trạng thái đúng, không phải lỗi setup.

---

## 2. Bản đồ port (dev)

| Service | Port host | Qua Caddy |
|---------|-----------|-----------|
| **Caddy** (origin duy nhất) | `8080` | — |
| NestJS backend | `3000` | `/api*` |
| Landing (Vite) | `5173` | `/` |
| Shell (Vite) | `5174` | `/app*` |
| Demo React remote (Vite) | `5175` | `/r/demo-react*` |
| Admin React remote (Vite) | `5176` | `/r/admin-react*` |
| Postgres | **`25432`** → container `5432` (chỉ khi `make infra`) | — |
| Redis | `6379` | — |

> Postgres map **`25432:5432`** chỉ tồn tại ở **infra path** (`make infra` → `docker-compose.infra.yml`). Host `.env` phải có `DATABASE_PORT=25432`. Ở path **`make up`** (full Docker), service `db` **không** publish port ra host (`docker-compose.yml` không có `ports:`), backend dùng `DATABASE_HOST=db` + port `5432` nội bộ.

---

## 3. Thứ tự khởi động hybrid (tóm tắt)

0. `. .dev-bin/env.sh` (toolchain Node 20.18.0 + pnpm 9.12.3)  
1. `make infra` (Postgres + Redis)  
2. Backend trên host: migrate → seed → `pnpm start:dev`  
3. Caddy host  
4. Landing → Shell → Demo React  

---

## 4. Bước 1 — Backend (Postgres, Redis, NestJS)

```bash
# Toolchain (Node 20.18.0 + pnpm 9.12.3) — chạy từ root repo
. .dev-bin/env.sh

# Chỉ cần db + redis (Nest chạy trên host) — target nằm ở Makefile root
make infra
# hoặc: docker compose -f docker-compose.yml -f docker-compose.infra.yml up -d db redis

cd backend

# Env (không commit .env)
cp .env.example .env
# Nên đổi các AUTH_*_SECRET bằng: openssl rand -base64 32
# Giữ DATABASE_PORT=25432 và APP_CORS_ORIGIN có http://localhost:8080

pnpm install --frozen-lockfile

# Đợi healthy rồi migrate + seed
pnpm migration:up
pnpm seed:run

# Dev server
pnpm start:dev
```

**Kiểm tra:**

```bash
curl http://localhost:3000/health
# Swagger (dev): http://localhost:3000/api/docs
```

### Tài khoản seed (chỉ dùng local)

| Email | Password | Scopes | Dùng để |
|-------|----------|--------|---------|
| `admin@example.com` | `12345678` | `ADMIN` | Admin remote + ADMIN APIs (không thấy Demo trừ khi có thêm `DASHBOARD`) |
| `dashboard@example.com` | `12345678` | `DASHBOARD` | Demo remote only |
| `dashboard@example.com` | `12345678` | `DASHBOARD` | Thấy Demo React remote trên shell |

Seed idempotent: chạy lại `pnpm seed:run` không tạo trùng / không làm hỏng password.

### Biến môi trường quan trọng (đã có trong `.env.example`)

```bash
APP_PORT=3000
APP_CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:8080
PUBLIC_GATEWAY_URL=http://localhost:8080

DATABASE_HOST=localhost
DATABASE_PORT=25432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mfe_backend
DATABASE_SYNCHRONIZE=false

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass
```

---

## 5. Bước 2 — Gateway (Caddy)

**Khuyến nghị:** Caddy trên host (HMR Vite ổn định hơn Docker).

```bash
# macOS
brew install caddy

cd gateway
caddy run --config Caddyfile
# Origin: http://localhost:8080
```

Daemon (tuỳ chọn):

```bash
cd gateway
caddy start --config Caddyfile
# Dừng: caddy stop
```

**Tuỳ chọn Docker** (khi không muốn cài Caddy host):

```bash
cd gateway
docker compose up -d
```

Compose trong `gateway/` dùng **`Caddyfile.docker`** + `host.docker.internal` (upstream là service chạy trên host). Path **`make up`** ở root thì khác: compose root mount **`gateway/Caddyfile.compose`** và trỏ theo DNS service của compose — `backend:3000`, `shell:5174`, `demo-react:5175`, `landing:5173` — không cần `host.docker.internal`. Chi tiết: [gateway/README.md](../gateway/README.md).

---

## 6. Bước 3 — Frontend apps

SDK `@mfe/sdk` export TypeScript source trực tiếp (`file:` deps) — **không cần build riêng**.

API gọi relative path `/api/v1/...` nên khi vào qua `:8080` **không bắt buộc** file `.env.local`.

**Package manager khác nhau theo app:** `landing/` dùng **npm** (`package-lock.json`, không có `pnpm-lock.yaml`); `shell/`, `remotes/demo-react/`, `remotes/admin-react/` và `packages/mfe-sdk/` dùng **pnpm** (pnpm lấy từ `.dev-bin/env.sh`).

```bash
# Terminal A — SDK (@mfe/sdk) — pnpm — cài TRƯỚC để shell/demo link qua file:
cd packages/mfe-sdk
pnpm install

# Terminal B — Landing — npm
cd landing
npm install        # hoặc: npm ci
npm run dev        # :5173

# Terminal C — Shell — pnpm
cd shell
pnpm install
pnpm dev           # :5174

# Terminal D — Demo remote — pnpm
cd remotes/demo-react
pnpm install
pnpm dev           # :5175

cd remotes/admin-react
pnpm install
pnpm dev           # :5176
```

Vite đã cấu hình `origin` / HMR qua `http://localhost:8080`.

### Kiểm tra frontend (theo package manager)

```bash
cd landing && npm run build && npm run typecheck                 # npm
cd shell && pnpm build && pnpm typecheck                         # pnpm
cd remotes/demo-react && pnpm build && pnpm typecheck            # pnpm
cd packages/mfe-sdk && pnpm test && pnpm typecheck               # vitest — 44 tests
node scripts/e2e-demo-remote.mjs                                 # E2E browser (stack phải đang chạy)
```

> `scripts/e2e-demo-remote.mjs` import `puppeteer`; repo không có `package.json` ở root nên phải đảm bảo `puppeteer` resolve được trước khi chạy.

---

## 7. Smoke test nhanh

Mở trình duyệt: **http://localhost:8080**

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | Mở `/` | Landing |
| 2 | Login `dashboard@example.com` / `12345678` | Redirect `/app` |
| 3 | DevTools → Application → Cookies | Có `refresh_token` (HttpOnly) |
| 4 | Nav trên shell | Thấy remote gắn scope `DASHBOARD` |
| 5 | Mở remote | Mount qua federation (không có token trên URL) |
| 6 | Logout | Cookie xoá / session blacklist → về `/login` |

Kiểm tra HTTP (khi mọi service đã lên):

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/api/docs
curl -I http://localhost:8080/app/
curl -I http://localhost:8080/r/demo-react/remoteEntry.js
curl -I http://localhost:8080/r/demo-react/mf-manifest.json   # URL shell thực sự load
curl -I http://localhost:8080/r/admin-react/mf-manifest.json
```

> `remoteEntry.js` trả 200 nhưng **không phải** URL shell load. Seeder đăng ký `${PUBLIC_GATEWAY_URL}/r/demo-react/mf-manifest.json`, và `toRuntimeEntry()` trong `@mfe/sdk` rewrite `remoteEntry.js` → `mf-manifest.json`. Nạp `remoteEntry.js` kiểu classic script là nguyên nhân lỗi runtime `RUNTIME-008` trên remote Vite ESM.

---

## 8. Chỉ chạy backend (không FE)

Khi chỉ cần API / Swagger:

```bash
cd backend
docker compose up -d db redis
pnpm migration:up && pnpm seed:run   # lần đầu
pnpm start:dev
```

- API: `http://localhost:3000`  
- Swagger: `http://localhost:3000/api/docs`  
- Cookie SameSite vẫn ổn nếu gọi từ `:8080`; gọi thẳng `:3000` chỉ nên dùng khi debug API.

---

## 9. Test backend

```bash
cd backend

# Unit (mock, không cần DB)
pnpm test

# E2E — DB riêng, không dùng DB dev
cp .env.test.example .env.test
pnpm db:create:test
pnpm migration:up:test
pnpm seed:run:test      # tuỳ chọn — seed data cho DB test
pnpm test:e2e

# Dọn DB test (không đụng DB dev)
pnpm db:drop:test
```

E2E **truncate** bảng domain — tuyệt đối không trỏ `.env.test` vào DB development.

---

## 10. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Backend không connect Postgres | Sai port | Đảm bảo `DATABASE_PORT=25432` và `docker compose ps` thấy `db` |
| Redis auth fail | Thiếu password | `REDIS_PASSWORD=redispass` khớp compose |
| `:8080` trống / 502 | Upstream chưa chạy | Bật landing/shell/remote/backend rồi reload Caddy |
| Login OK nhưng `/app` 401 | Cookie không set / sai origin | Chỉ dùng `http://localhost:8080`; kiểm tra cookie `refresh_token` |
| Remote không load | Demo Vite tắt hoặc seed thiếu | `pnpm dev` trong `remotes/demo-react`; login user có `DASHBOARD` |
| Admin không thấy demo remote | Đúng theo design | `ADMIN` **không** bypass `accessible`; dùng `dashboard@example.com` hoặc gán scope `DASHBOARD` |
| Port đã bị chiếm | Process cũ | `lsof -i :8080` / `:3000` / `:5173` rồi kill |
| HMR Vite lỗi qua proxy | Caddy Docker / thiếu origin | Dùng host Caddy; kiểm tra `origin`/`hmr` trong `vite.config.ts` |

Dừng infra:

```bash
cd backend && docker compose stop db redis
# hoặc xoá volume (mất data local):
# docker compose down -v
```

---

## 11. Checklist “đã sẵn sàng”

- [ ] Node 20.18.0 + pnpm 9.x  
- [ ] `backend/.env` từ `.env.example`, `DATABASE_PORT=25432`  
- [ ] `docker compose up -d db redis` healthy  
- [ ] `pnpm migration:up` + `pnpm seed:run`  
- [ ] `pnpm start:dev` → `/health` OK  
- [ ] `caddy run --config Caddyfile` trong `gateway/`  
- [ ] `npm run dev` cho landing (npm); `pnpm dev` cho shell, demo-react, admin-react  
- [ ] Browser chỉ mở `http://localhost:8080`  
- [ ] Login `admin@example.com` → nav có **Admin**; login `dashboard@example.com` → có Demo, không có Admin  

---

## 12. Admin remote (shipped)

`remotes/admin-react` — xem [plans/260913-2113-admin-remote-ui/plan.md](../plans/260913-2113-admin-remote-ui/plan.md).

- Vite remote port **5176**, gateway `/r/admin-react*`
- Seed `MfeConfig` `routeName=admin`, `remoteName=adminReact`, scopes `[ADMIN]`
- **Hệ quả:** `admin@example.com` thấy Admin nhưng **không** thấy Demo — `ADMIN` **không** bypass `accessible`. Muốn cả hai phải grant thêm `DASHBOARD`.

---

## Tài liệu liên quan

- [README.md](../README.md) — overview + quickstart ngắn  
- [gateway/README.md](../gateway/README.md) — Caddy host vs Docker  
- [backend/README.md](../backend/README.md) — API, scripts, auth model  
- [docs/deployment-guide.md](./deployment-guide.md) — Docker/prod / CI  
- [docs/system-architecture.md](./system-architecture.md) — luồng auth + federation  

---

**Last updated:** 2026-09-13
