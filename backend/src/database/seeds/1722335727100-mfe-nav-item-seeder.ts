import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { MfeNavItemEntity } from '@/api/mfe-config/entities/mfe-nav-item.entity';
import { MfeNavItemType } from '@/api/mfe-config/mfe-nav-item.constants';
import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { Uuid } from '@/common/types/common.type';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { DataSource, Repository } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DASHBOARD_SCOPE } from './1722335726000-scope-seeder';

type NavSeedNode = {
  type: MfeNavItemType;
  title: string;
  path?: string;
  sortOrder: number;
  scopeNames: string[];
  children?: NavSeedNode[];
};

/**
 * Paths must match real remote routes.
 * Empty `path` = app index (`/app/{routeName}`); shell links to `/{routeName}`.
 */
const TREES: Record<string, NavSeedNode[]> = {
  product: [
    {
      type: MfeNavItemType.Route,
      title: 'Product',
      path: '',
      sortOrder: 0,
      scopeNames: [DASHBOARD_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'Categories',
      path: 'categories',
      sortOrder: 1,
      scopeNames: [DASHBOARD_SCOPE],
    },
    {
      type: MfeNavItemType.Group,
      title: 'Admin tools',
      sortOrder: 2,
      scopeNames: [ADMIN_SCOPE],
      children: [
        {
          type: MfeNavItemType.Route,
          title: 'Categories (admin)',
          path: 'categories',
          sortOrder: 0,
          scopeNames: [ADMIN_SCOPE],
        },
      ],
    },
  ],
  // Article hub is index-only — single index leaf.
  article: [
    {
      type: MfeNavItemType.Route,
      title: 'Articles',
      path: '',
      sortOrder: 0,
      scopeNames: [DASHBOARD_SCOPE],
    },
  ],
  admin: [
    {
      type: MfeNavItemType.Route,
      title: 'Users',
      path: 'users',
      sortOrder: 0,
      scopeNames: [ADMIN_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'Scopes',
      path: 'scopes',
      sortOrder: 1,
      scopeNames: [ADMIN_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'MFE configs',
      path: 'configs',
      sortOrder: 2,
      scopeNames: [ADMIN_SCOPE],
    },
  ],
  // Hosted Vue memory history syncs to /app/vue/* via @mfe/sdk location-sync.
  vue: [
    {
      type: MfeNavItemType.Route,
      title: 'Overview',
      path: '',
      sortOrder: 0,
      scopeNames: [DASHBOARD_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'Analytics',
      path: 'analytics',
      sortOrder: 1,
      scopeNames: [DASHBOARD_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'Reports',
      path: 'reports',
      sortOrder: 2,
      scopeNames: [DASHBOARD_SCOPE],
    },
    {
      type: MfeNavItemType.Route,
      title: 'Notifications',
      path: 'notifications',
      sortOrder: 3,
      scopeNames: [DASHBOARD_SCOPE],
    },
  ],
};

/**
 * Sample nav trees per demo config. Runs after the MfeConfig seeder (filename
 * order). Idempotent: replaces the seeded trees for known routeNames.
 *
 * Product includes an ADMIN-only group so dashboard users exercise the filter.
 */
export class MfeNavItemSeeder1722335727100 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const configRepo = dataSource.getRepository(MfeConfigEntity);
    const navRepo = dataSource.getRepository(MfeNavItemEntity);
    const scopeRepo = dataSource.getRepository(ScopeEntity);

    const dashboardScope = await scopeRepo.findOneByOrFail({
      name: DASHBOARD_SCOPE,
    });
    const adminScope = await scopeRepo.findOneByOrFail({ name: ADMIN_SCOPE });
    const scopesByName: Record<string, ScopeEntity> = {
      [DASHBOARD_SCOPE]: dashboardScope,
      [ADMIN_SCOPE]: adminScope,
    };

    for (const [routeName, tree] of Object.entries(TREES)) {
      const config = await configRepo.findOne({ where: { routeName } });
      if (!config) continue;

      await navRepo.delete({ mfeConfigId: config.id });
      await insertNodes(navRepo, config.id, null, tree, scopesByName);
    }
  }
}

async function insertNodes(
  navRepo: Repository<MfeNavItemEntity>,
  configId: Uuid,
  parentId: Uuid | null,
  nodes: NavSeedNode[],
  scopesByName: Record<string, ScopeEntity>,
): Promise<void> {
  for (const node of nodes) {
    const saved = await navRepo.save(
      new MfeNavItemEntity({
        mfeConfigId: configId,
        parentId,
        type: node.type,
        title: node.title,
        path: node.type === MfeNavItemType.Route ? (node.path ?? '') : null,
        sortOrder: node.sortOrder,
        scopes: node.scopeNames.map((name) => scopesByName[name]),
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      }),
    );
    if (node.children?.length) {
      await insertNodes(
        navRepo,
        configId,
        saved.id,
        node.children,
        scopesByName,
      );
    }
  }
}
