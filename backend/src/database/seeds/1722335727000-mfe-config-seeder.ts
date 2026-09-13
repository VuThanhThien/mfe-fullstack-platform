import type { MfeFramework } from '@/api/mfe-config/dto/create-mfe-config.req.dto';
import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DASHBOARD_SCOPE } from './1722335726000-scope-seeder';

const DASHBOARD_EMAIL = 'dashboard@example.com';
const DASHBOARD_USERNAME = 'dashboarduser';
const DASHBOARD_PASSWORD = '12345678';

/**
 * Seeds:
 *  1. `dashboard@example.com` user with DASHBOARD scope (idempotent).
 *  2. Stub MfeConfigs for the demo-react and admin-react remotes
 *     (idempotent by routeName).
 *
 * Rules:
 *  - Never `save()` an existing user (avoids password rehash via @BeforeUpdate).
 *  - Use relation `.add()` for scope grants on existing users.
 *  - Do NOT grant the admin user DASHBOARD (ADMIN ≠ see demo via intersection).
 */
export class MfeConfigSeeder1722335727000 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const userRepo = dataSource.getRepository(UserEntity);
    const scopeRepo = dataSource.getRepository(ScopeEntity);
    const mfeRepo = dataSource.getRepository(MfeConfigEntity);

    // ── 1. Scopes (must already exist from scope seeder) ───────────────────
    const dashboardScope = await scopeRepo.findOneByOrFail({
      name: DASHBOARD_SCOPE,
    });
    const adminScope = await scopeRepo.findOneByOrFail({
      name: ADMIN_SCOPE,
    });

    // ── 2. Dashboard user ──────────────────────────────────────────────────
    let dashboardUser = await userRepo.findOne({
      where: { email: DASHBOARD_EMAIL },
      relations: { scopes: true },
    });

    if (!dashboardUser) {
      dashboardUser = await userRepo.save(
        new UserEntity({
          username: DASHBOARD_USERNAME,
          email: DASHBOARD_EMAIL,
          password: DASHBOARD_PASSWORD,
          scopes: [dashboardScope],
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        }),
      );
    } else if (!dashboardUser.scopes?.some((s) => s.name === DASHBOARD_SCOPE)) {
      // Relation-only update: never save() existing user (rehashes password).
      await userRepo
        .createQueryBuilder()
        .relation(UserEntity, 'scopes')
        .of(dashboardUser)
        .add(dashboardScope);
    }

    // ── 3. Stub MfeConfigs for the platform remotes ────────────────────────
    // remoteEntry points at mf-manifest.json so the MF runtime reads
    // remoteEntry.type=module (raw remoteEntry.js + classic script →
    // RUNTIME-008 on Vite ESM remotes).
    const gatewayUrl =
      process.env.PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';

    const seeds: MfeConfigSeed[] = [
      {
        routeName: 'demo',
        remoteEntry: `${gatewayUrl}/r/demo-react/mf-manifest.json`,
        remoteName: 'demoReact',
        exposedModule: './App',
        title: 'Demo React',
        framework: 'react',
        scopes: [dashboardScope],
      },
      {
        routeName: 'admin',
        remoteEntry: `${gatewayUrl}/r/admin-react/mf-manifest.json`,
        remoteName: 'adminReact',
        exposedModule: './App',
        title: 'Admin',
        framework: 'react',
        scopes: [adminScope],
      },
    ];

    for (const seed of seeds) {
      await upsertMfeConfig(mfeRepo, seed);
    }
  }
}

interface MfeConfigSeed {
  routeName: string;
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
  title: string;
  framework: MfeFramework;
  scopes: ScopeEntity[];
}

async function upsertMfeConfig(
  mfeRepo: Repository<MfeConfigEntity>,
  seed: MfeConfigSeed,
): Promise<void> {
  const existing = await mfeRepo.findOneBy({ routeName: seed.routeName });

  if (!existing) {
    await mfeRepo.save(
      new MfeConfigEntity({
        ...seed,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      }),
    );
  } else if (existing.remoteEntry !== seed.remoteEntry) {
    // Keep seed idempotent but heal older remoteEntry.js URLs.
    existing.remoteEntry = seed.remoteEntry;
    existing.updatedBy = SYSTEM_USER_ID;
    await mfeRepo.save(existing);
  }
}
