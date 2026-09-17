import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { DASHBOARD_SCOPE } from '@/database/seeds/1722335726000-scope-seeder';
import { configureApp } from '@/utils/configure-app';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
// Relative on purpose: tsconfig's `paths` only maps `@/<dir>/*`, there is no
// bare `@/...` alias, and `test/` is outside the build's type-check.
import { AppModule } from '../../src/app.module';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './auth.helper';

/**
 * Boots the application through the *same* pipeline as production
 * (`configureApp`), so prefix, URI versioning, the global guards and the
 * exception filter are all active. Without this, every authz assertion below
 * would pass vacuously.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();

  return app;
}

/**
 * Wipes every domain table and recreates the deterministic fixtures the suite
 * relies on: the `ADMIN` + `DASHBOARD` scopes and an admin user that owns
 * `ADMIN`.
 *
 * Seeding directly (instead of shelling out to `pnpm seed:run`) keeps the suite
 * hermetic; the CLI seeders are verified separately, including idempotency.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);

  // Guard rail: this truncates every domain table. Losing dev data because a
  // `.env.test` pointed at `mfe_backend` would be silent and unrecoverable, and
  // the plan lists exactly this as a high-impact risk.
  const databaseName = String(dataSource.options.database ?? '');
  if (!/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to truncate "${databaseName}": the e2e suite only runs against a *test* database. Check DATABASE_NAME in .env.test (see .env.test.example).`,
    );
  }

  await dataSource.query(
    'TRUNCATE mfe_nav_item_scope, mfe_nav_item, mfe_config_scope, mfe_config, user_scope, scope, session, "user" RESTART IDENTITY CASCADE',
  );

  const scopeRepository = dataSource.getRepository(ScopeEntity);
  await scopeRepository.save([
    new ScopeEntity({
      name: ADMIN_SCOPE,
      description: 'Full administrative access',
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    }),
    new ScopeEntity({
      name: DASHBOARD_SCOPE,
      description: 'Demo scope for accessible tests',
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    }),
  ]);

  const adminScope = await scopeRepository.findOneByOrFail({
    name: ADMIN_SCOPE,
  });

  await dataSource.getRepository(UserEntity).save(
    new UserEntity({
      username: 'admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      scopes: [adminScope],
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    }),
  );
}
