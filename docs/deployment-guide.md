# Deployment & DevOps Guide

**Date:** 2026-09-13  
**Version:** 1.1  
**Scope:** Deployment of the shipped stack — NestJS backend (`backend/`), landing / shell / demo-react frontends, `@mfe/sdk`, Caddy gateway (`:8080`), Postgres 16, Redis 7.

> **This is a v1.1 rewrite.** v1.0 was written before the Dockerfile / `.dockerignore` / typecheck batch landed and documented an image layout, a compose topology and a set of environment variables that do not exist in the repository. Every command, variable, port and path below was re-checked against the files listed under *Authority*. §8.5 lists what changed.

**Authority (open these before trusting this document):**  
`docker-compose.yml`, `docker-compose.infra.yml`, `Makefile`, `.dockerignore`, `.env.example`, `backend/.env.example`, `backend/Dockerfile`, `backend/docker-entrypoint.dev.sh`, `backend/docker-compose.yml`, `landing/Dockerfile`, `shell/Dockerfile`, `remotes/demo-react/Dockerfile`, `gateway/{Caddyfile,Caddyfile.compose,Caddyfile.docker,docker-compose.yml}`, `gateway/README.md`, and each app's `package.json`.

---

## 1. Deployment Quick Start

**Local / host setup is not documented here.** Ports, hybrid startup order, `backend/.env` handling, seed users and troubleshooting live in [local-development-guide.md](./local-development-guide.md). This guide owns deployment; what follows is what a deployer actually needs from the local model.

### 1.1 Toolchain

```bash
. .dev-bin/env.sh      # pins Node 20.18.0 + pnpm 9.12.3 on PATH
```

`.dev-bin/env.sh` loads nvm, selects Node 20.18.0 and prepends `.dev-bin/` (the local pnpm 9.12.3 shim) to `PATH`. Source it for every host-side command (`make`, migrations from a checkout, e2e). The backend's `packageManager` field also pins `pnpm@9.12.3`.

### 1.2 Single-origin model (the constraint everything else follows)

The browser must only ever see **one origin**: `http://localhost:8080` in the compose stack, or the production domain. Caddy fans that origin out to four upstreams:

| Path prefix | Upstream (compose) | Service |
|---|---|---|
| `/api*` | `backend:3000` | NestJS API (`API_PREFIX=api`, versioned `/api/v1/...`) |
| `/app*` | `shell:5174` | Shell MFE host (Vite dev) |
| `/r/demo-react*` | `demo-react:5175` | Demo remote (Vite dev) |
| `/` (catch-all) | `landing:5173` | Landing (Vite dev) |

The refresh token is an **HttpOnly cookie with `SameSite=Lax`**, so the browser sends it only on same-site requests. Splitting the API onto a second hostname (`api.example.com` + `example.com`) breaks the cookie round-trip and session revival — the v1.0 two-hostname split was wrong and is gone.

Frontend apps hold **no API base URL**. `@mfe/sdk` calls relative `/api/v1/...` paths with `withCredentials: true` (`packages/mfe-sdk/src/http.ts`), and there is no `VITE_*` usage anywhere in the repo. The SDK's remote loader also rewrites a `remoteEntry.js` reference to `mf-manifest.json` (`toRuntimeEntry()`).

### 1.3 Deployer-facing `make` targets

From the repo root — the `Makefile` is the supported entry point:

| Target | What it does |
|---|---|
| `make up` | `docker compose up -d --build`, then `wait-backend`; browse http://localhost:8080 |
| `make down` | Stop and remove containers, keep volumes |
| `make infra` | Postgres `:25432` + Redis `:6379` only (overlay `docker-compose.infra.yml`) |
| `make migrate` | `docker compose exec backend pnpm migration:up` |
| `make seed` | `docker compose exec backend pnpm seed:run` |
| `make reset` | `down -v` + `up -d --build` — **destroys local database data** |
| `make rebuild` | `build --no-cache`, then `up -d`, then `wait-backend` |
| `make smoke` | 4 gateway route checks (`/`, `/api/docs`, `/app/`, `/r/demo-react/remoteEntry.js`) plus a direct `curl http://localhost:3000/health` |
| `make wait-backend` | Polls `http://localhost:3000/health` until 200, up to 60 attempts |
| `make ps` / `make logs` | Compose service list / tail all logs |

`make smoke`'s `/api/docs` check only returns 200 when the backend runs with `NODE_ENV=development`: Swagger is mounted by `configure-app.ts` under `if (nodeEnv === Environment.DEVELOPMENT)`, not by an environment variable.

---

## 2. Backend Deployment

### 2.1 The real backend image — `backend/Dockerfile`

Multi-stage, four stages, all Node **20.18.0 `bookworm-slim`**. The base is glibc on purpose (`pnpm@9` has no linux-arm64-musl build, so Alpine breaks on Apple Silicon) and pnpm is installed with npm rather than corepack (Node 20.18 corepack hits signature keyid errors):

| Stage | Base | What it does |
|---|---|---|
| `base` | `node:20.18.0-bookworm-slim` | installs `procps`, runs `corepack disable && npm install -g pnpm@9.12.3` |
| `development` | `base` | `COPY package.json pnpm-lock.yaml` → `pnpm install` (**dev deps included**), copies the source, `chmod +x docker-entrypoint.dev.sh`, `chown -R node:node /app`, `USER node`, `ENTRYPOINT ["/app/docker-entrypoint.dev.sh"]`, `CMD ["pnpm","start:dev"]` |
| `builder` | `base` | reuses `development`'s `node_modules`, runs `pnpm build`, then `ENV NODE_ENV=production`, `pnpm prune --prod`, `pnpm install --prod` |
| `production` | `node:20.18.0-bookworm-slim` | copies `src/generated/i18n.generated.ts`, the pruned `node_modules`, `dist/` and `package.json`; `USER node`; `CMD ["node","dist/main.js"]` |

Three consequences the previous revision got wrong:

1. The image declares **no `EXPOSE` and no `HEALTHCHECK`**. The port is documented only by `backend/.env.example` (`APP_PORT=3000`); health probing is provided by the *compose* healthcheck (§2.2).
2. The **`production` stage contains no pnpm** — it is based on plain `node`, not `base` — and it carries no `env-cmd`, `ts-node` or `typeorm-ts-node-commonjs`, because dev dependencies are pruned.
3. A single-stage `pnpm install --frozen-lockfile --prod` followed by `pnpm build` **cannot work**: `@nestjs/cli`, which provides the `build` script's binary, is a `devDependency`. Build first, prune afterwards — which is what the real Dockerfile does.

### 2.2 Compose topology

`docker-compose.yml` (root, project name **`mfe-platform`**) is the full stack:

- **No `version:` key.** The obsolete `version: '3.9'` from v1.0 is removed — current Compose rejects/ignores it.
- Named volumes `mfe_pg_data`, `mfe_redis_data`, `mfe_caddy_data`, `mfe_caddy_config`; network **`mfe`** (bridge); locally built images are named `mfe-platform-<service>`.
- `db`: `postgres:16-alpine`, **no published host port** — host access comes only from `docker-compose.infra.yml` via `make infra`. Healthcheck `["CMD-SHELL","pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]`, interval 5s, timeout 5s, retries 20.
- `redis`: `redis:7-alpine`, no published host port, `redis-server --requirepass ${REDIS_PASSWORD:-redispass}`. Healthcheck `["CMD","redis-cli","-a","${REDIS_PASSWORD:-redispass}","ping"]`, interval 5s, timeout 5s, retries 20.
- `backend`: `build: {context: ./backend, target: development}` plus `env_file: ./backend/.env.example`, with compose injecting the container-specific values:

  ```yaml
  environment:
    NODE_ENV: development
    APP_URL: http://127.0.0.1:3000
    APP_PORT: 3000
    APP_CORS_ORIGIN: http://localhost:8080,http://localhost:3000,http://localhost:5173
    PUBLIC_GATEWAY_URL: http://localhost:8080
    DATABASE_HOST: db
    DATABASE_PORT: 5432
    REDIS_HOST: redis
    REDIS_PORT: 6379
    RUN_MIGRATIONS: ${RUN_MIGRATIONS:-true}
    RUN_SEEDS: ${RUN_SEEDS:-true}
  ports:
    - "${BACKEND_HOST_PORT:-3000}:3000"
  ```

  Its healthcheck is a `node -e` HTTP GET of `http://127.0.0.1:3000/health` (interval 10s, timeout 5s, retries 18, start_period 40s).
- `landing`, `shell`, `demo-react`: `context: .` with `target: development`, bind-mounting each app's `src/` **plus `packages/mfe-sdk/src`** so SDK edits hot-reload; `CHOKIDAR_USEPOLLING=true`; `depends_on: [backend]`.
- `gateway`: `image: caddy:2-alpine`, `${GATEWAY_HOST_PORT:-8080}:80`, mounting `./gateway/Caddyfile.compose`. **No env file, no env substitution** — the Caddyfile is static.

> **`.env` caveat (important).** The compose backend service uses `env_file: ./backend/.env` (copy from `.env.example`). Compose `environment:` overrides host-oriented values (e.g. `DATABASE_HOST=db`). Placeholder secrets in a local `.env` are fine for a sandbox and **never acceptable in production** — see §2.4.

`backend/docker-compose.yml` is a **separate, older standalone stack**. It is not used by the root compose file and not used by `make`:

- `mfe-backend-api` (`image: mfe-backend-api`, `env_file: .env`, `3000:3000`),
- `db`: **`postgres:16`** (not alpine) publishing **`25432:5432`**,
- `redis`: **`redis/redis-stack:latest`** publishing `6379` and `8001`,
- `maildev` (built from `maildev.Dockerfile`) and `pgadmin` (`18080:80`),
- volumes `postgres_data`, `redis_data`, `pgadmin_data`; network `mfe-backend-network`.

The root file is the authority for deployment; `backend/docker-compose.yml` is host tooling.

**Infra-only** is `make infra`, which runs `docker compose -f docker-compose.yml -f docker-compose.infra.yml up -d db redis` and publishes Postgres **25432** / Redis **6379**. Plain `docker compose up -d` starts the **whole** stack — it is not a db/redis-only command. A backend running on the host in this mode reads `DATABASE_PORT=25432` from `backend/.env`.

### 2.3 Migrations and seeds

Three supported paths, all verified against the repo:

1. **On boot (the default).** `backend/docker-entrypoint.dev.sh` first waits for Postgres and Redis (60 × 1s each), then, when `RUN_MIGRATIONS=true` (default), runs
   `pnpm exec env-cmd -f .env --no-override typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run`
   (falls back to `.env.example` if `.env` is missing),
   and when `RUN_SEEDS=true` (default) runs
   `pnpm exec env-cmd -f .env --no-override ts-node ./node_modules/typeorm-extension/bin/cli.cjs seed:run`,
   then `exec "$@"`. This is why `make up` needs no separate migration step.
2. **Inside a running stack:** `make migrate` / `make seed` (same `env-cmd -f .env --no-override` pattern). `make reset` wipes volumes and re-runs both from scratch.
3. **From a host checkout** with the toolchain and dev dependencies installed (`cd backend && pnpm install --frozen-lockfile`, then `pnpm migration:up`) pointed at the target database.

Migration rollback from a host checkout is `pnpm migration:down` (`pnpm typeorm migration:revert`).

> **Migrations cannot be run from the `production` image as built.** That stage has no pnpm and none of `env-cmd` / `ts-node` / `typeorm-ts-node-commonjs`, and its dev dependencies are pruned. Any `docker run … pnpm migration:up` against the production image fails — the recipe v1.0 carried here (its §2.3 and §7.2) was impossible and has been removed. A real production deploy needs a dedicated migration job or image: for example build and run the `development` target with `RUN_MIGRATIONS=true`, confirm success, then start the `production` image. There is no in-image rollback path either.

### 2.4 Secrets Management

**Never commit `.env` files.** Keep the committed examples (`backend/.env.example`, `.env.example`, `backend/.env.test.example`) as templates only.

**Local:** copy `backend/.env.example` → `backend/.env` and replace all four `AUTH_*_SECRET` values (`openssl rand -base64 32`). `.gitignore` excludes `.env`, `.env.local`, `.env.test` (and legacy `.env.docker` if present) and keeps the `*.example` files. Prefer a **single** `backend/.env` for host and Compose — do not maintain `.env.docker`.

**Production:** the JWT / refresh / forgot / confirm-email secrets must come from a secret manager — AWS Secrets Manager, Google Secret Manager, HashiCorp Vault — or from an environment-specific file injected at deploy time and never committed. A production compose must supply real secrets via `env_file` / `environment`, never commit them.

**CI:** store secrets as masked workflow secrets (§6) and never echo them.

The full env contract, verified against `backend/.env.example`:

```bash
NODE_ENV=development
MODULES_SET=monolith

APP_NAME="MFE Backend API"
APP_URL=http://localhost:3000           # also the base for the dev Swagger ping in /health
APP_PORT=3000
APP_DEBUG=false
API_PREFIX=api                          # global prefix; /health and / are excluded
APP_FALLBACK_LANGUAGE=en
APP_LOG_LEVEL=debug
APP_LOG_SERVICE=console
APP_CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:8080

PUBLIC_GATEWAY_URL=http://localhost:8080   # seeder base for the stub remote entry

DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=25432                     # host port, published by docker-compose.infra.yml
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=mfe_backend
DATABASE_LOGGING=true
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass
REDIS_TLS_ENABLED=false

MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@example.com
MAIL_DEFAULT_NAME=No Reply
MAIL_CLIENT_PORT=1080

AUTH_JWT_SECRET=secret                              # REPLACE in every real environment
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=secret_for_refresh              # REPLACE
AUTH_REFRESH_TOKEN_EXPIRES_IN=365d
AUTH_FORGOT_SECRET=secret_for_forgot                # REPLACE
AUTH_FORGOT_TOKEN_EXPIRES_IN=7d
AUTH_CONFIRM_EMAIL_SECRET=secret_for_confirm_email  # REPLACE
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d
```

Notes:

- `DATABASE_PORT=25432` is the **host** port; inside compose it is overridden to `5432` on service DNS `db`.
- `APP_CORS_ORIGIN` lists three origins (3000, 5173, 8080).
- There is **no `THROTTLE_ENABLED`** and **no `API_ENABLE_DOCUMENTATION`** variable in this codebase. Swagger is gated by `NODE_ENV === development` alone.
- There are **no `VITE_*` variables** and no `.env.local` in this repo (see §3).

### 2.5 Building and publishing the image

```bash
# From the repository root
docker build -f backend/Dockerfile --target production -t my-registry/mfe-backend:1.1.0 backend
docker push my-registry/mfe-backend:1.1.0
```

`--target development` produces the dev image whose entrypoint runs migrations/seeds and then `pnpm start:dev`.

---

## 3. Frontend Deployment

v1.0 contained no frontend Dockerfiles at all. All three apps have them, and both the build context and the SDK-dependency handling are load-bearing.

### 3.1 Shared model: repository-root build context

`landing/`, `shell/` and `remotes/demo-react/` each have a Dockerfile with `development`, `builder` and `production` targets, and **all three are built with the repository root as the context**:

```yaml
# docker-compose.yml
landing:
  build:
    context: .
    dockerfile: landing/Dockerfile
    target: development
```

The root context exists so that `packages/mfe-sdk` is inside it. Each app depends on the SDK as `"@mfe/sdk": "file:../packages/mfe-sdk"` (`file:../../packages/mfe-sdk` for the remote), and the SDK ships **TypeScript source** (`exports` → `./src/index.ts`, `files: ["src"]`). Vite therefore resolves the SDK's own runtime dependency (`axios`) from `packages/mfe-sdk/node_modules`, so every Dockerfile installs it in place:

| Dockerfile | SDK runtime-dependency step |
|---|---|
| `landing/Dockerfile` | `rm -rf /workspace/packages/mfe-sdk/node_modules && npm install --prefix /workspace/packages/mfe-sdk --omit=dev --no-package-lock --no-audit --no-fund` |
| `shell/Dockerfile` | `cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile --prod` |
| `remotes/demo-react/Dockerfile` | `cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile --prod` |

The `rm -rf` guard in the landing image matters: npm does not prune directories it does not recognise, so any `node_modules` arriving via `COPY` (host pnpm store, darwin-only binaries) would linger in the image. Without these steps the container build fails to resolve `axios` from `packages/mfe-sdk/src`.

**Package managers differ by app** (verified against lockfiles):

| App | Manager | Lockfile | Install in Dockerfile |
|---|---|---|---|
| `landing/` | **npm** | `package-lock.json` (no pnpm lockfile) | `npm ci --no-audit --no-fund` |
| `shell/` | pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| `remotes/demo-react/` | pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |
| `packages/mfe-sdk/` | pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile --prod` |

All three Node stages use `node:20.18.0-bookworm-slim`; `shell` and `demo-react` install pnpm with `corepack disable && npm install -g pnpm@9.12.3`; `landing` uses the image's bundled npm.

### 3.2 landing (`landing/Dockerfile`)

- `development`: copies `packages/mfe-sdk`, installs the SDK runtime deps (above), copies `landing/package.json` + `landing/package-lock.json`, runs `npm ci`, copies `landing/`, sets `CHOKIDAR_USEPOLLING=true`, `EXPOSE 5173`, `CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]`.
- `builder`: `FROM development AS builder` → `npm run build` (`tsc -b && vite build`).
- `production`: `FROM caddy:2-alpine`, copies `/workspace/landing/dist` → `/srv` and `landing/Caddyfile.static` → `/etc/caddy/Caddyfile`, `EXPOSE 80`.

`landing/Caddyfile.static` serves `/srv` with `encode gzip` and an SPA fallback (`try_files {path} /index.html`). Deploy it as a container or copy `dist/` to any static host — the app needs no API base URL, because it calls `/api/v1/...` on its own origin.

### 3.3 shell (`shell/Dockerfile`)

Same three stages, pnpm-based: `development` exposes `5174` and runs `pnpm dev --host 0.0.0.0 --port 5174`; `builder` runs `pnpm build`; `production` copies `shell/dist` → `/srv` and `shell/Caddyfile.static`.

- The shell is served under **`/app/`** — Vite `base="/app/"`. `gateway/Caddyfile.compose` issues `redir /app /app/ 308` so the bare `/app` URL does not break asset resolution.
- `shell/Caddyfile.static` uses `handle_path /app*` (stripping the prefix) with a SPA fallback and redirects anything else to `/app/`.
- The shell is the federation **host**: it registers remotes through `@mfe/sdk` and shares the `@mfe/sdk` singleton plus `react-hook-form` with them, so shell and remote images must be deployed together.

### 3.4 demo-react remote (`remotes/demo-react/Dockerfile`)

Same pattern: `development` exposes `5175` and runs `pnpm dev --host 0.0.0.0 --port 5175`; `builder` runs `pnpm build`; `production` copies `remotes/demo-react/dist` → `/srv` and `remotes/demo-react/Caddyfile.static` (serves `/r/demo-react*` via `handle_path`, redirects the rest to `/r/demo-react/`).

- Served at base **`/r/demo-react/`**.
- The registry entry seeded for this remote is **`${PUBLIC_GATEWAY_URL}/r/demo-react/mf-manifest.json`** — **not `remoteEntry.js`**. `backend/src/database/seeds/1722335727000-mfe-config-seeder.ts` stores the manifest URL deliberately so the MF runtime reads `remoteEntry.type = module`; a raw `remoteEntry.js` loaded as a classic script produces `RUNTIME-008` on Vite ESM remotes. `@mfe/sdk`'s `toRuntimeEntry()` also rewrites a `remoteEntry.js` URL to `mf-manifest.json` defensively when healing older rows. In compose, `PUBLIC_GATEWAY_URL=http://localhost:8080`.
- **Cache-bust `mf-manifest.json` on every deploy.** The seeded URL is stable while the asset hashes inside it change; serve it with `Cache-Control: no-store` (or a version suffix) or the shell keeps loading a stale remote.

### 3.5 Image hygiene and build-context size

The root `.dockerignore` excludes **both** a bare `node_modules` **and** `**/node_modules`, deliberately: the bare form covers the context root, and the `**/` form covers nested packages such as `packages/mfe-sdk/node_modules`. Together with the `rm -rf` guard in `landing/Dockerfile`, this fixed a leak of host `node_modules` into the landing image (reported ~8.0M → ~4.2M, with the build context shrinking to roughly 571B).

> **Live gap.** `.pnpm-store` (~554M), `.npm-cache` (~182M), `.pnpm-cache` (~101M), `.corepack` (~20M) and `repomix-output.xml` (~20M) are listed in `.gitignore` but **not** in `.dockerignore`, and they sit in the repository root that all three frontend builds use as their context. Until they are excluded, each frontend build ships roughly 880M of caches to the Docker daemon. This is a deploy-time cost, not a correctness bug.

### 3.6 Caddy Gateway (Production)

#### 3.6.1 The three real Caddyfiles

| File | Used by | Upstreams | Notes |
|---|---|---|---|
| `gateway/Caddyfile` | Host Caddy (`caddy run --config Caddyfile` from `gateway/`) | `localhost:3000 / 5174 / 5175 / 5173` | Listens `:8080`. No `/app` redirect. |
| `gateway/Caddyfile.compose` | Root `docker-compose.yml` (`make up`) | compose DNS `backend:3000`, `shell:5174`, `demo-react:5175`, `landing:5173` | Listens `:80`; **includes `redir /app /app/ 308`** |
| `gateway/Caddyfile.docker` | `gateway/docker-compose.yml` | `host.docker.internal:*` | Listens `:80`; that compose file adds `extra_hosts: host.docker.internal:host-gateway` for Linux |

All three use the same shape — plain `reverse_proxy` inside `handle` blocks. `header_uri` is **not** a Caddy directive; the v1.0 configs that used it were invalid and have been replaced:

```caddyfile
:80 {
  handle /api* {
    reverse_proxy backend:3000
  }

  # Vite base="/app/" — bare /app breaks asset resolution
  redir /app /app/ 308

  handle /app* {
    reverse_proxy shell:5174
  }

  handle /r/demo-react* {
    reverse_proxy demo-react:5175
  }

  handle {
    reverse_proxy landing:5173
  }
}
```

There is **no `gateway/.env`**, no environment substitution, and no `CADDY_ADMIN` / `CADDY_LOG_LEVEL` variable anywhere in the repo — those v1.0 lines were invented. The gateway serves **plain HTTP**; TLS is terminated by whatever sits in front of it, or by Caddy itself with a real hostname (§3.6.2). The full port map and the host-vs-Docker comparison live in [`gateway/README.md`](../gateway/README.md).

#### 3.6.2 Production Caddy sketch

One origin, TLS by hostname:

```caddyfile
app.example.com {
  encode gzip

  handle /api* {
    reverse_proxy backend:3000
  }

  # Bare /app must 308 to /app/ — Vite base="/app/" cannot resolve assets
  # from the un-slashed path. The production sketch needs this line.
  redir /app /app/ 308

  handle /app* {
    reverse_proxy shell:80
  }

  handle /r/demo-react* {
    reverse_proxy demo-react:80
  }

  handle {
    reverse_proxy landing:80
  }
}
```

Here `shell` / `demo-react` / `landing` are the **`production` (static) images**, which listen on port `80`; `backend` is the API image on `3000`. Do **not** add a second hostname for the API — it breaks the `SameSite=Lax` refresh cookie (§1.2).

#### 3.6.3 Running the gateway in production

The repo's own container run is the compose gateway service, not a bare `docker run`:

```yaml
gateway:
  image: caddy:2-alpine
  ports:
    - "${GATEWAY_HOST_PORT:-8080}:80"
  volumes:
    - ./gateway/Caddyfile.compose:/etc/caddy/Caddyfile:ro
    - mfe_caddy_data:/data
    - mfe_caddy_config:/config
```

For a real domain, replace `Caddyfile.compose` with a hostname-based config (§3.6.2) and publish `80:80` / `443:443` instead of `8080:80`. On the host, `caddy run --config gateway/Caddyfile` is the quick alternative — install commands are in `gateway/README.md`.

---

## 4. Database Backup & Recovery

### 4.1 PostgreSQL

Postgres data lives in the compose volume **`mfe_pg_data`** (mounted at `/var/lib/postgresql/data` in the `db` service; the Docker volume name is `mfe-platform_mfe_pg_data`). The database is `mfe_backend` and the default superuser is `postgres` (`POSTGRES_USER` in `.env`).

```bash
# Inside the running stack (root compose project)
docker compose exec db pg_dump -U postgres mfe_backend > backup.sql

# Restore
docker compose exec -T db psql -U postgres mfe_backend < backup.sql

# With a local psql against the infra Postgres (host port 25432)
pg_dump  -h localhost -p 25432 -U postgres mfe_backend > backup.sql
psql     -h localhost -p 25432 -U postgres mfe_backend < backup.sql
```

Note the port: **25432** is the host port published by `docker-compose.infra.yml` (`make infra`); the container always listens on `5432`.

**Automated backups (cron):**

```bash
# /etc/cron.d/db-backup
0 2 * * * root /usr/local/bin/backup-db.sh

# /usr/local/bin/backup-db.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -p 25432 -U postgres mfe_backend | gzip > /backups/mfe_backend_$TIMESTAMP.sql.gz
find /backups -name "mfe_backend_*.sql.gz" -mtime +30 -delete  # keep 30 days
```

Also snapshot the volume itself with the database stopped, and remember that `docker compose down -v` / `make reset` **destroys `mfe_pg_data`**.

### 4.2 Redis

Redis persists to the compose volume **`mfe_redis_data`** (mounted at `/data`), so the dump file is **`/data/dump.rdb`** inside the `redis` container — not `/var/lib/redis/dump.rdb` as v1.0 claimed.

```bash
# Trigger a snapshot (the server requires a password)
docker compose exec redis redis-cli -a "${REDIS_PASSWORD:-redispass}" BGSAVE

# Copy the dump out
docker compose cp redis:/data/dump.rdb ./redis-backup.rdb
```

Redis holds sessions and the token blacklist. Losing it logs everyone out and un-blacklists outstanding refresh tokens; it is not a source of truth, but keep `mfe_redis_data` on persistent storage.

---

## 5. Monitoring & Observability

### 5.1 `/health`

`GET /health` is served by `HealthController` (`backend/src/api/health/health.controller.ts`) via `@nestjs/terminus` and returns a Terminus `HealthCheckResult` — **not** `{"status":"ok"}`:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "api-docs": { "status": "up" }
  }
}
```

- `database` is a TypeORM `pingCheck('database')` and is always present.
- `api-docs` is an HTTP ping of `${APP_URL}/api/docs` and appears **only when `NODE_ENV=development`** — the same condition that mounts Swagger. In production `details` contains only `database`.
- A failing check makes Terminus answer HTTP **503** (`status: "error"`) — Terminus default behaviour, not project configuration.
- `/health` is **excluded from the global `API_PREFIX`** (`configure-app.ts` excludes `GET /` and `GET health`), so the path is `/health`, never `/api/health`.

The compose `backend` service already polls it with `node -e` (interval 10s, 18 retries, 40s start period), so a single `/health` URL serves both liveness and readiness.

### 5.2 Gateway health

Caddy has no health endpoint in this repo, and the **admin API is not published** by any compose service — only container port `80` is exposed and `2019` is never mapped, so `curl http://localhost:2019/...` from the host cannot reach it. Probe the gateway through its public routes instead:

```bash
make smoke   # /, /api/docs, /app/, /r/demo-react/remoteEntry.js + direct /health
```

### 5.3 Logging

Backend logs are structured JSON via `nestjs-pino` (`APP_LOG_LEVEL`, `APP_LOG_SERVICE`) written to stdout. Use `make logs` / `docker compose logs -f <service>` locally, and ship stdout to ELK, Datadog, Splunk or CloudWatch in production — the app needs no change to be collected centrally.

### 5.4 Metrics

**There is no metrics endpoint, and `prom-client` is not a dependency of `backend/`** (verified against `backend/package.json`). The `Counter`/`Histogram` example v1.0 carried here has been removed. Adding Prometheus metrics requires a **new dependency** (`prom-client` or an equivalent NestJS module) plus a controller and route — it is not a configuration change.

---

## 6. CI/CD Pipeline

### 6.1 CI is not wired up

> **There is no `.github/` directory in this repository (verified).** The pipeline below is a **reference template only — nothing in it runs today.** The git root is a single monorepo on branch **`master`** with **zero commits**, and there are no nested per-package repos.

Any real workflow must use `master` (not `main`/`develop`), pin pnpm to **9.12.3** and Node to **20.18.0**, and **create and migrate the test database before the e2e run**.

```yaml
# .github/workflows/backend.yml — REFERENCE TEMPLATE, NOT ACTIVE
name: Backend

on:
  push:
    branches: [master]
    paths: ['backend/**', 'docker-compose*.yml', '.github/workflows/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mfe_backend_test   # must match DATABASE_NAME in .env.test
        ports: ['25432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres -d mfe_backend_test"
          --health-interval 5s --health-timeout 5s --health-retries 20
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s --health-timeout 5s --health-retries 20

    steps:
      - uses: actions/checkout@v4

      # MUST be pinned - backend/package.json pins packageManager pnpm@9.12.3
      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.3

      - uses: actions/setup-node@v4
        with:
          node-version: 20.18.0
          cache: pnpm
          cache-dependency-path: backend/pnpm-lock.yaml

      - run: cd backend && pnpm install --frozen-lockfile

      # e2e reads .env.test (gitignored; supply it from CI secrets/vars)
      - name: Create and migrate the test database
        run: |
          cd backend
          pnpm db:create:test
          pnpm migration:up:test
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 25432
          REDIS_HOST: localhost

      - run: cd backend && pnpm lint
      - run: cd backend && pnpm test
      - run: cd backend && pnpm test:e2e
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 25432
          REDIS_HOST: localhost
```

The `build` / `deploy` jobs from v1.0 are omitted on purpose: no registry, no deploy host and no branch protection are configured. When you add them:

- build the backend with `context: backend`, `target: production`;
- build each frontend with **`context: .`** (repository root), `target: production` — a `context: landing` build fails because `packages/mfe-sdk` is outside it;
- run migrations as a separate job **before** rolling out the new API image (§2.3).

---

## 7. Rollout & Rollback

### 7.1 Blue-green / rolling deploy

```bash
# 1. Build and push the new images (backend --target production; frontends
#    context "." --target production)
# 2. Run the migration job - see §2.3. It CANNOT be run from the production
#    backend image (no pnpm, no ts-node, dev deps pruned).
# 3. Start the new colour alongside the old one, with Caddy pointed at it.
# 4. Health check the new colour before switching traffic.
curl -fsS http://<new-colour>:3000/health
# 5. Switch: update the upstream in the Caddyfile, then restart the gateway.
docker compose restart gateway
#    `caddy reload` requires the admin API, which no compose service here
#    publishes (see §5.2). Either restart the container as above, or map the
#    admin port explicitly and use `caddy reload --address <host:port>`.
# 6. Soak on the old colour, then remove it.
```

### 7.2 Rollback

```bash
# 1. Point Caddy back at the previous colour and restart the gateway
docker compose restart gateway

# 2. Inspect the failed version's logs
docker compose logs --tail=200 backend

# 3. Revert the schema if the migration is reversible - from a host checkout
#    with dev dependencies. There is no in-image rollback.
cd backend && pnpm migration:down

# 4. Remove the failed colour
```

`migration:revert` undoes exactly one migration per invocation, so a multi-step release needs repeated calls. Auth state and the `mfe_configs` registry live in Postgres — back up before reverting.

---

## 8. Production Checklist

### 8.1 Images and build context

- [ ] `production` targets built for the backend and all three frontends (`--target production`). `make up` builds the **development** targets and is not a production deployment.
- [ ] Backend `production` image contains no pnpm and no dev dependencies (by design) — a separate migration job exists (§2.3).
- [ ] Root `.dockerignore` also excludes `.pnpm-store`, `.npm-cache`, `.pnpm-cache`, `.corepack` and `repomix-output.xml`, so the frontend build context is kilobytes rather than hundreds of megabytes (§3.5).
- [ ] No host `node_modules` inside any frontend image (the `**/node_modules` rule plus the landing `rm -rf` guard).

### 8.2 Configuration and secrets

- [ ] All `.env` files in `.gitignore`; only `*.example` files committed.
- [ ] Real secrets injected from AWS Secrets Manager / Vault / GCP Secret Manager — **not** `backend/.env.example` (§2.4).
- [ ] `RUN_MIGRATIONS` and `RUN_SEEDS` set to **`false`** for production application containers; migrations run as an explicit deploy job and seeding never touches production data.
- [ ] `NODE_ENV=production` (this also disables Swagger and the `/health` api-docs ping).
- [ ] `DATABASE_SYNCHRONIZE=false` (hand-written migrations only).

### 8.3 Origin, cookies and transport

- [ ] **A single origin** serves the landing, `/app/`, `/r/demo-react/` and `/api*`; no second API hostname (§1.2).
- [ ] HTTPS enabled (Caddy automatic TLS with a real hostname, or TLS terminated upstream).
- [ ] Refresh cookie `Secure` in production, plus `HttpOnly`, `SameSite=Lax`, `Path=/`; `APP_CORS_ORIGIN` lists only the production origin.
- [ ] `redir /app /app/ 308` present in the production Caddyfile.
- [ ] `mf-manifest.json` served with cache-busting / `no-store` so remote deploys take effect (§3.4).
- [ ] The backend is not reachable directly from the internet — only through the gateway.

### 8.4 Operations

- [ ] Database backups automated and a restore rehearsed; `mfe_pg_data` on persistent storage.
- [ ] `mfe_redis_data` on persistent storage; `BGSAVE` scheduled.
- [ ] Logging centralized; alerting on `/health` 503 and gateway 5xx.
- [ ] Rate limiting on auth endpoints — **not implemented in this codebase**; enforce it at the gateway/WAF until it exists in the app.
- [ ] DDoS protection / WAF in front of the gateway.
- [ ] Graceful shutdown: `enableShutdownHooks()` is **not called anywhere in `backend/src`** (verified). Treat SIGTERM draining of in-flight requests as **unverified** and add it deliberately if the deployment needs it.
- [ ] Staging mirrors production (same origin model, same image targets).
- [ ] Runbooks for common incidents; on-call rotation.

### 8.5 What changed in this revision (v1.0 → v1.1)

- §1's local-development walkthrough reduced to a pointer at [local-development-guide.md](./local-development-guide.md); only deployment-relevant deltas kept.
- Removed invented configuration: `THROTTLE_ENABLED`, `API_ENABLE_DOCUMENTATION`, `VITE_API_URL`, `VITE_PUBLIC_GATEWAY_URL`, the `gateway/.env` file, `CADDY_ADMIN`, `CADDY_LOG_LEVEL`, and the "self-signed TLS" gateway description.
- Backend Dockerfile section rewritten to the real four-stage `bookworm-slim` image; the impossible `--prod` install-then-build and the impossible `docker run … pnpm migration:up` recipes removed, with the limitation stated.
- Compose section rewritten to the real `mfe-platform` project, volumes, network, healthchecks and port model; obsolete `version: '3.9'` removed; `backend/docker-compose.yml` documented separately; `docker compose up -d` no longer presented as db/redis-only.
- New frontend-deployment chapter (§3): the three Dockerfiles, the SDK runtime-dependency install, the npm/pnpm split, and image/build-context hygiene including the remaining cache gap.
- Gateway section rewritten to the three real Caddyfiles, `handle`-block `reverse_proxy` routing, the `redir /app /app/ 308` requirement, and the single-origin cookie model replacing the two-hostname split.
- Monitoring documents the real Terminus payload and drops the `prom-client` example (not a dependency).
- CI section labelled an inactive reference template on branch `master`; e2e creates and migrates the test database first; pnpm pinned to 9.12.3.
- `/health` no longer described as a Caddy admin surface; `caddy reload` replaced by `docker compose restart gateway` with the admin-API caveat.

---

**Document version:** 1.1  
**Last updated:** 2026-09-13
