# MFE Backend API

Standalone NestJS backend for the micro-frontend workspace. It owns:

- **Authentication** — email/password login, refresh tokens, Redis session blacklist
- **Scope model** — the authorization primitive for the MFE shell (no Role/Permission tables)
- **MFE config registry** — remote entry / remote name / exposed module, each gated by scopes

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

## Getting started

```bash
# 1. Toolchain
nvm use                     # Node 20.18.0
corepack enable             # pnpm 9.12.3 from package.json#packageManager

# 2. Environment — never commit .env / .env.docker
cp .env.example .env
# then set fresh AUTH_JWT_SECRET / AUTH_REFRESH_SECRET /
# AUTH_FORGOT_SECRET / AUTH_CONFIRM_EMAIL_SECRET

# 3. Dependencies
pnpm install --frozen-lockfile

# 4. Infrastructure (Postgres on host port 25432, Redis on 6379)
docker compose up -d db redis

# 5. Schema + seed data
pnpm migration:up
pnpm seed:run

# 6. Run
pnpm start:dev             # http://localhost:3000
```

- API root: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- Health: `GET http://localhost:3000/health` (excluded from the `/api` prefix)
- All application routes are versioned: **`/api/v1/...`**

## Seeded credentials (development only)

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `12345678` |
| Scopes | `ADMIN` |

`pnpm seed:run` also creates a handful of scope-less users. Re-running the seeders is a
no-op. **These credentials are for local development only** — production bootstrap must
supply its own admin password (tracked as a hardening TODO).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm start:dev` | Watch-mode development server |
| `pnpm build` | Compile to `dist/` |
| `pnpm lint` | ESLint with `--fix` |
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
  and returns the ANY-overlap set. `ADMIN` does **not** bypass this intersection — the
  full registry is available at `GET /api/v1/mfe-configs` (ADMIN only).
- Admin routes require the `ADMIN` scope on the access token.

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

- `.env`, `.env.docker` and `.env.test` are gitignored — never commit real secrets.
- `APP_CORS_ORIGIN` is an explicit allow-list because credentials are enabled.
- `DATABASE_SYNCHRONIZE` stays `false`; schema changes only via reviewed migrations.
- Docker credentials (`postgres/postgres`, `redispass`) are local-only defaults.

## License

MIT — forked from [vndevteam/nestjs-boilerplate](https://github.com/vndevteam/nestjs-boilerplate).
