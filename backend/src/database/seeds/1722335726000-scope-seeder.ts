import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

/** Demo scope used by the e2e "accessible" intersection tests. */
export const DASHBOARD_SCOPE = 'DASHBOARD';

export const DEFAULT_SCOPES = [
  { name: ADMIN_SCOPE, description: 'Full administrative access' },
  { name: DASHBOARD_SCOPE, description: 'Demo scope for accessible tests' },
] as const;

/**
 * Must sort *before* the user seeder: typeorm-extension runs seeds in filename
 * order, and the user seeder attaches `ADMIN` to the admin user.
 */
export class ScopeSeeder1722335726000 implements Seeder {
  track = false;

  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(ScopeEntity);

    for (const scope of DEFAULT_SCOPES) {
      const existing = await repository.findOneBy({ name: scope.name });
      if (existing) continue;

      await repository.save(
        new ScopeEntity({
          name: scope.name,
          description: scope.description,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        }),
      );
    }
  }
}
