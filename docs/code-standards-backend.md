# Backend Code Standards (NestJS)

> Part of the code-standards set. Hub and cross-cutting rules: [`docs/code-standards.md`](./code-standards.md).
> Backend: [`code-standards-backend.md`](./code-standards-backend.md) · Frontend: [`code-standards-frontend.md`](./code-standards-frontend.md) · SDK: [`code-standards-sdk.md`](./code-standards-sdk.md)

**Authority:** running code wins — `backend/src/` is ground truth for auth, scopes and the MFE registry.

**Siblings:** §2 Frontend → [`code-standards-frontend.md`](./code-standards-frontend.md) · §3 SDK → [`code-standards-sdk.md`](./code-standards-sdk.md) · §4–§6 hub → [`code-standards.md`](./code-standards.md).

---

## 1. Backend Code Standards (NestJS)

### 1.1 Project Structure

```
backend/
├── src/
│   ├── api/                      # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.req.dto.ts
│   │   │   │   ├── login.res.dto.ts
│   │   │   │   └── ...
│   │   │   ├── types/
│   │   │   ├── config/
│   │   │   └── auth.service.spec.ts
│   │   ├── user/
│   │   ├── scope/
│   │   ├── mfe-config/
│   │   ├── health/
│   │   └── api.module.ts         # Root API module
│   ├── config/                    # Typed configuration
│   ├── database/                  # Schema, entities, migrations, seeds
│   ├── decorators/               # Custom decorators
│   ├── filters/                  # Exception filters
│   ├── guards/                   # Auth guards
│   ├── utils/                    # Helpers
│   ├── constants/                # App constants, error codes
│   ├── i18n/                     # Message catalogs
│   └── main.ts                   # Entry point
├── test/                         # E2E tests
├── .env.example
├── .env.test.example
├── package.json
└── tsconfig.json
```

### 1.2 Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| **Module** | `{feature}.module.ts` | `auth.module.ts` |
| **Service** | `{feature}.service.ts` | `auth.service.ts` |
| **Controller** | `{feature}.controller.ts` | `auth.controller.ts` |
| **Entity** | `{feature}.entity.ts` or `{Feature}Entity` | `user.entity.ts` → `UserEntity` |
| **DTO (Request)** | `{action}.req.dto.ts` or `{Feature}ReqDto` | `login.req.dto.ts` → `LoginReqDto` |
| **DTO (Response)** | `{action}.res.dto.ts` or `{Feature}ResDto` | `login.res.dto.ts` → `LoginResDto` |
| **Guard** | `{name}.guard.ts` | `auth.guard.ts` → `AuthGuard` |
| **Decorator** | `{name}.decorator.ts` | `require-scopes.decorator.ts` → `@RequireScopes` |
| **Filter** | `{name}.filter.ts` | `global-exception.filter.ts` → `GlobalExceptionFilter` |
| **Test file** | `{artifact}.spec.ts` | `auth.service.spec.ts` |
| **Migration** | `{timestamp}-{description}.ts` | `1721488504685-create-user-table.ts` |
| **Seeder** | `{timestamp}-{description}.ts` | `1722335726000-scope-seeder.ts` |

### 1.3 Scope & Authorization Naming

**Scopes (uppercase, underscore-separated):**
- Valid: `ADMIN`, `DASHBOARD`, `EDITOR`, `VIEWER`, `APP:READ`, `RESOURCE.EDIT`
- Invalid: `admin` (lowercase), `Admin Scope` (spaces), `123ADMIN` (starts with digit)
- Regex: `^[A-Z0-9_:.-]{2,50}$`

**Routes (lowercase, hyphen-separated):**
- Valid: `demo`, `admin-panel`, `user-settings`
- Invalid: `Demo` (uppercase), `admin_panel` (underscore), `AdminPanel` (camelCase)
- Regex: `^[a-z0-9-]{2,40}$`

### 1.4 Decorators

**Standard decorators (NestJS built-in):**

```typescript
// Method decorators
@Get('/:id')
@Post()
@Patch('/:id')
@Delete('/:id')

// Parameter decorators
@Param('id', UUIDValidationPipe)
@Body()
@Query()
@Headers()

// Guard decorators (global via bootstrap, also apply per-route)
@UseGuards(AuthGuard)
@RequireScopes('ADMIN')  // Custom decorator (applies ScopesGuard)

// Module decorators
@Module({ ... })
@Controller('endpoint')
@Injectable()
```

**Custom decorators (project-specific):**

```typescript
// Extract current user from request
@CurrentUser() user: UserEntity

// Require specific scopes (applies ScopesGuard)
@RequireScopes('ADMIN', 'EDITOR')

// Swagger documentation
@ApiOperation({ summary: '...' })
@ApiResponse({ status: 200, type: LoginResDto })
```

### 1.5 Exception Handling

**Global exception filter maps errors to HTTP status + `errorCode`:**

| Error | Status | errorCode | Notes |
|-------|--------|-----------|-------|
| `BadRequestException` (incl. `ValidationException`, which extends it) | 400 | E001, E003, E006 | Duplicate username/email (E001), email already exists (E003), unknown scope names (E006) |
| `UnauthorizedException` | 401 | — | Missing/invalid/blacklisted token |
| `ForbiddenException` | 403 | — | Missing required scope |
| `NotFoundException` | 404 | — | Entity not found |
| `ConflictException` | 409 | E005 | Scope still referenced by an MFE config (`scope.error.in_use`) |
| `ValidationError` (ValidationPipe) | 422 | — | Bad DTO (class-validator) |
| Unhandled exception | 500 | — | Bug; logged with stack trace |

**Only the codes above are raised today.** `error-code.constant.ts` also declares `E002`
(`user.error.not_found`), `E004` (`scope.error.not_found`), `E007` (`mfe-config.error.not_found`),
`V001` and `V002`, but no service throws them — do not cite them as an HTTP contract until
they are wired up. (`E009` does not exist at all.)

**Response format:**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "errorCode": "E006",
  "message": "Unknown scopes: UNKNOWN_SCOPE",
  "timestamp": "2026-09-13T12:00:00Z"
}
```

`error` is the HTTP reason phrase (`STATUS_CODES[statusCode]`) and is present on **every**
response `GlobalExceptionFilter` emits — including 500s and the ones without an `errorCode`.

### 1.6 TypeORM & Migrations

**Entities:**
- Use `AbstractEntity` base class (provides `id`, `createdAt`, `updatedAt`)
- Always use `@PrimaryGeneratedColumn('uuid')` for IDs
- Use `@Index()` for unique constraints + foreign keys
- Never use `synchronize: true` (migrations only)

**Migrations:**
- Hand-written SQL only (never auto-generated without review)
- Versioned by timestamp (`1721488504685`)
- Use explicit index names (`UQ_`, `FK_` prefixes)
- Include both `up()` and `down()` for rollback

**Example:**

```typescript
// Entity
@Entity('user')
export class UserEntity extends AbstractEntity {
  @Column({ unique: true })
  email!: string;
  
  @Column()
  passwordHash!: string;
}

// Migration
export class CreateUserTable implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}
```

### 1.7 Testing

**Unit tests (mocked):**
- File: `{service}.spec.ts`
- Run: `pnpm test`
- Coverage: services, guards, decorators (no DB)
- Mocking: Jest `jest.mock()`, `mockImplementation()`

**E2E tests (real DB):**
- File: `test/e2e/{feature}.e2e.spec.ts`
- Run: `pnpm test:e2e`
- Coverage: full request→response, auth guards, scopes
- Database: real Postgres + Redis (test env)
- Cleanup: truncate domain tables per spec

**Patterns:**

```typescript
// Unit test
describe('AuthService', () => {
  let service: AuthService;
  
  beforeEach(() => {
    service = new AuthService(mockJwtService, mockUserRepository);
  });
  
  it('should hash password on registration', async () => {
    const result = await service.register({ email: '...', password: '...' });
    expect(result.userId).toBeDefined();
  });
});

// E2E test
describe('POST /api/v1/auth/email/login (e2e)', () => {
  it('should return access token + refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/email/login')
      .send({ email: 'admin@example.com', password: '12345678' })
      .expect(200);
    
    expect(res.body.accessToken).toBeDefined();
    expect(res.get('Set-Cookie')).toMatch(/refresh_token/);
  });
});
```

### 1.8 Configuration

**Use typed config (avoid `process.env` directly):**

```typescript
// backend/src/api/auth/config/auth.config.ts
import { registerAs } from '@nestjs/config';
import validateConfig from '@/utils/validate-config';
import { AuthConfig } from './auth-config.type';

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator); // @IsNotEmpty + @IsMs per key
  return {
    secret: process.env.AUTH_JWT_SECRET,
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN,
    refreshSecret: process.env.AUTH_REFRESH_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env.AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN,
  };
});

// Usage — the namespace is 'auth' and the key is the short name, NOT jwtExpires
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService<AllConfigType>) {}

  getSomething() {
    return this.configService.get('auth.expires', { infer: true });
  }
}
```

Every value is required (no `|| '15m'` fallbacks); the durations are validated as
millisecond strings by class-validator, so they come from `.env`, not from defaults.

---

**Document version:** 2.0  
**Last updated:** 2026-09-13
