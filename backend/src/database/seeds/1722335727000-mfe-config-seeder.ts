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
 *  2. Stub MfeConfigs for product/article (same bundle), admin-react,
 *     and demo-vue (idempotent by routeName). Removes legacy `demo` row if present.
 *
 * Rules:
 *  - Never `save()` an existing user (avoids password rehash via @BeforeUpdate).
 *  - Use relation `.add()` for scope grants on existing users.
 *  - Do NOT grant the admin user DASHBOARD (ADMIN ≠ see product via intersection).
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

    const dashboardScope = await scopeRepo.findOneByOrFail({
      name: DASHBOARD_SCOPE,
    });
    const adminScope = await scopeRepo.findOneByOrFail({
      name: ADMIN_SCOPE,
    });

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
      await userRepo
        .createQueryBuilder()
        .relation(UserEntity, 'scopes')
        .of(dashboardUser)
        .add(dashboardScope);
    }

    // remoteEntry keeps `/r/demo-react/…` until optional folder rename.
    const gatewayUrl =
      process.env.PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';
    const productRemoteEntry = `${gatewayUrl}/r/demo-react/mf-manifest.json`;

    const seeds: MfeConfigSeed[] = [
      {
        routeName: 'product',
        remoteEntry: productRemoteEntry,
        remoteName: 'productReact',
        exposedModule: './Product',
        title: 'Products',
        framework: 'react',
        iconUrl: 'https://example.com/icons/product.png',
        scopes: [dashboardScope],
      },
      {
        routeName: 'article',
        remoteEntry: productRemoteEntry,
        remoteName: 'productReact',
        exposedModule: './Article',
        title: 'Articles',
        framework: 'react',
        iconUrl: 'https://example.com/icons/article.png',
        scopes: [dashboardScope],
      },
      {
        routeName: 'admin',
        remoteEntry: `${gatewayUrl}/r/admin-react/mf-manifest.json`,
        remoteName: 'adminReact',
        exposedModule: './App',
        title: 'Admin',
        framework: 'react',
        iconUrl: 'https://example.com/icons/admin.png',
        scopes: [adminScope],
      },
      {
        routeName: 'vue',
        remoteEntry: `${gatewayUrl}/r/demo-vue/mf-manifest.json`,
        remoteName: 'demoVue',
        exposedModule: './App',
        title: 'Vue Dashboard',
        framework: 'vue',
        iconUrl: 'https://example.com/icons/vue.png',
        scopes: [dashboardScope],
      },
    ];

    // Drop legacy demo before upserts — same remote_entry as product/article.
    await mfeRepo.delete({ routeName: 'demo' });

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
  iconUrl?: string;
  scopes: ScopeEntity[];
}

async function upsertMfeConfig(
  mfeRepo: Repository<MfeConfigEntity>,
  seed: MfeConfigSeed,
): Promise<void> {
  const existing = await mfeRepo.findOne({
    where: { routeName: seed.routeName },
    relations: { scopes: true },
  });

  if (!existing) {
    await mfeRepo.save(
      new MfeConfigEntity({
        ...seed,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      }),
    );
    return;
  }

  existing.remoteEntry = seed.remoteEntry;
  existing.remoteName = seed.remoteName;
  existing.exposedModule = seed.exposedModule;
  existing.title = seed.title;
  existing.framework = seed.framework;
  existing.iconUrl = seed.iconUrl ?? null;
  existing.scopes = seed.scopes;
  existing.updatedBy = SYSTEM_USER_ID;
  await mfeRepo.save(existing);
}
