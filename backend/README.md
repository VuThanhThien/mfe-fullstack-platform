# MFE Backend API

Standalone NestJS backend for the micro-frontend workspace. It owns:

- **Authentication** — email/password login, refresh tokens, Redis session blacklist
- **Scope model** — the authorization primitive for the MFE shell (no Role/Permission tables)
- **MFE config registry** — remote entry / remote name / exposed module, each gated by scopes
- **Nav trees** — per-config nested `group` \| `route` menus (ADMIN CRUD; shell drawer is lazy + scope-filtered)

Authorization is **scope-only**. There is no `isAdmin` flag and no role table: an
administrator is simply a user that owns the `ADMIN` scope. An access token carries
`scopes: string[]`; admin routes are guarded by `@RequireScopes(ADMIN_SCOPE)`.

> Reference material for this service lives in the umbrella workspace that contains this
> repo: `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-implementation-notes.md`
> (implementation notes — where the running code corrected the spec) and
> `docs/brainstorm/2026-09-12-phase-b-backend-auth-mfe-spec.md` (spec).
> The original Phase B execution plan was consolidated away and is no longer on disk.

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node `20.18.0` (`.nvmrc`), pnpm `9.12.3` (`packageManager`) |
| Framework | NestJS 10, Express |
| Database | Postgres 16 + TypeORM 0.3 (hand-written SQL migrations, `synchronize: false`) |
| Cache / blacklist | Redis (`cache-manager-ioredis-yet`) |
| Docs | Swagger at `/api/docs` (development only) |
| Logging | pino (`nestjs-pino`) |

## Local development

### Prerequisites

- From repo root: `. .dev-bin/env.sh` (Node 20.18.0 + pnpm 9.12.3)
- Docker for Postgres + Redis via **`make infra`** (host ports `25432` / `6379`)

### Install

```bash
# From umbrella root
. .dev-bin/env.sh
make infra

cd backend
cp .env.example .env
# set fresh AUTH_*_SECRET values; keep DATABASE_PORT=25432
# APP_CORS_ORIGIN should include every Vite origin you open (5173–5177 + 8080)
pnpm install --frozen-lockfile
```

### Env

| File | Purpose |
|------|---------|
| `.env` | Dev server + migrate/seed |
| `.env.test` | Jest e2e (never point at the dev DB) |

Leave `COOKIE_DOMAIN` unset locally.

### Run

```bash
pnpm migration:up
pnpm seed:run
pnpm start:dev             # http://localhost:3000
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Health: `GET /health`
- Routes: **`/api/v1/...`**

### Ports & origins

| Service | Port |
|---------|------|
| Nest | `3000` |
| Postgres (`make infra`) | `25432` |
| Redis | `6379` |

### Quality

```bash
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:e2e          # needs `.env.test` + test DB
pnpm build
```

Git hooks (husky / commitlint / lint-staged) live at the **umbrella root**, not in this package.

### Verify

```bash
curl http://localhost:3000/health
```

### Related

- Hub: [docs/local-development-guide.md](../docs/local-development-guide.md)

## Seeded credentials (development only)

| Email | Password | Scopes |
|-------|----------|--------|
| `admin@example.com` | `12345678` | `ADMIN` |
| `dashboard@example.com` | `12345678` | `DASHBOARD` |

`pnpm seed:run` is idempotent. **Dev only** — production bootstrap must supply its own admin password.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm start:dev` | Watch-mode development server |
| `pnpm build` | Compile to `dist/` |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm format` / `format:check` | Prettier |
| `pnpm test` | Unit tests (jest) |
| `pnpm test:e2e` | E2E tests against a real Postgres + Redis (uses `.env.test`) |
| `pnpm migration:up` / `:down` / `:show` | Apply / revert / list migrations |
| `pnpm migration:generate <path>` | Draft a migration from entity drift |
| `pnpm seed:run` | Run seeders (`typeorm-extension`) |
| `pnpm db:create` / `db:drop` | Create / drop the configured database |
| `pnpm db:create:test` / `migration:up:test` | Same, against the test database |

## Testing

### Unit tests

```bash
pnpm test
```

Unit tests run against mocks only and need no database.

### E2E tests

E2E boots a real application — the same `configureApp()` pipeline as production,
including `/api/v1` versioning, `AuthGuard` + `ScopesGuard` and the global
exception filter — and talks to real Postgres and Redis.

E2E **truncates every domain table**, so it must never point at your development
database. It uses a dedicated database via `.env.test`:

```bash
# 1. One-time: create the test environment file (gitignored)
cp .env.test.example .env.test

# 2. One-time: create and migrate the test database
pnpm db:create:test
pnpm migration:up:test

# 3. Run
pnpm test:e2e
```

The suite is serial (`maxWorkers: 1` + `--runInBand`) because the specs share one
database, and jest is asked to `forceExit` because the Redis/BullMQ connections
survive `app.close()`.

Fixtures are created by the harness itself (`test/utils/create-test-app.ts`), so
the suite is hermetic: `admin@example.com` owns `ADMIN`, and
`plain@example.com` owns no scopes. The CLI seeders are verified separately
(`pnpm seed:run` twice is a no-op).


## Authorization model

```
user ──< user_scope >── scope ──< mfe_config_scope >── mfe_config

accessible(user) = mfe_config WHERE scopes(mfe_config) ∩ scopes(user) ≠ ∅
```

- `scope.name` matches `^[A-Z0-9_:.-]{2,50}$` and is unique. Scopes are never created
  implicitly by assigning them.
- `GET /api/v1/mfe-configs/accessible` resolves the caller's scopes **from the database**
  and returns the ANY-overlap set (includes optional `iconUrl`). `ADMIN` does **not** bypass this intersection — the
  full registry is available at `GET /api/v1/mfe-configs` (ADMIN only).
- `GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible` returns the filtered tree for one config.
  **404** if the config is missing or not in the caller's accessible set (same no-bypass rule).
- Admin routes require the `ADMIN` scope on the access token.

### MFE nav endpoints

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/v1/mfe-configs/accessible` | authenticated; launcher payload (`iconUrl?`) |
| GET | `/api/v1/mfe-configs/by-route/:routeName/nav/accessible` | authenticated; lazy drawer tree |
| GET / POST | `/api/v1/mfe-configs/:id/nav-items` | ADMIN |
| PATCH | `/api/v1/mfe-configs/:id/nav-items/reorder` | ADMIN |
| PATCH / DELETE | `/api/v1/mfe-configs/:id/nav-items/:itemId` | ADMIN |

Writes require non-empty `scopeNames[]` (existing scopes only). `iconUrl` is HTTPS-only when set. Nav is UX, not ACL.

**Ops:** Compose does not auto-apply new migrations to an existing volume. After pulling nav-tree migrations onto a long-lived `make up` stack, run `make migrate` (and `make seed` for demo trees).

## ⚠️ Scope staleness (15 minutes)

Scope checks read the access token, not the database, so **scope grants and revocations
take effect on the next refresh**, not immediately. The access token TTL is `15m`
(`AUTH_JWT_TOKEN_EXPIRES_IN`). Consequences:

- Granting a scope can take up to 15 minutes (or one `POST /api/v1/auth/refresh`) to apply.
- Revoking a scope leaves the old privileges usable until that access token expires.
- **`POST /api/v1/auth/logout` is the only instant kill switch** — it blacklists the
  session in Redis immediately.

Endpoints whose authorization must be exact (for example `mfe-configs/accessible`) re-read
from the database rather than trusting the token.

Hardening TODOs: shorten `AUTH_REFRESH_TOKEN_EXPIRES_IN` (currently `365d`) and rotate
refresh tokens; consider invalidating sessions on scope change.

## Project layout

```
src/
├── api/            auth, user, scope, mfe-config, health, home
├── config/         typed config namespaces (app, auth, database, mail)
├── database/       data-source, entities, migrations, seeds, factories
├── decorators/     @CurrentUser, @RequireScopes, field + http decorators
├── filters/        GlobalExceptionFilter (422 / 400 / 404 / 409 mapping)
├── guards/         AuthGuard (global), ScopesGuard (global)
├── i18n/           en / vi / jp messages
└── main.ts         bootstrap (delegates shared setup to utils/configure-app.ts)
test/               e2e specs + shared configureApp() harness
```

## Security notes

- `.env` and `.env.test` are gitignored — never commit real secrets. Prefer `.env` for Docker Compose (`env_file: .env`); do not introduce a parallel `.env.docker`.
- `APP_CORS_ORIGIN` is an explicit allow-list because credentials are enabled.
- `DATABASE_SYNCHRONIZE` stays `false`; schema changes only via reviewed migrations.
- Docker credentials (`postgres/postgres`, `redispass`) are local-only defaults.

## License

MIT — forked from [vndevteam/nestjs-boilerplate](https://github.com/vndevteam/nestjs-boilerplate).
