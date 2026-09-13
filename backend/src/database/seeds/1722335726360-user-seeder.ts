import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { ADMIN_SCOPE, SYSTEM_USER_ID } from '@/constants/app.constant';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class UserSeeder1722335726360 implements Seeder {
  track = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    const repository = dataSource.getRepository(UserEntity);
    const adminScope = await dataSource
      .getRepository(ScopeEntity)
      .findOneByOrFail({ name: ADMIN_SCOPE });

    const adminUser = await repository.findOne({
      where: { username: 'admin' },
      relations: { scopes: true },
    });

    if (!adminUser) {
      await repository.save(
        new UserEntity({
          username: 'admin',
          email: 'admin@example.com',
          password: '12345678',
          bio: "hello, i'm a backend developer",
          image: 'https://example.com/avatar.png',
          scopes: [adminScope],
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        }),
      );

      // Scope-less fixtures for the "non-admin gets 403" cases. Created only on
      // the first run so that re-running `seed:run` adds nothing.
      const userFactory = factoryManager.get(UserEntity);
      await userFactory.saveMany(5);
    } else if (!adminUser.scopes?.some((s) => s.name === ADMIN_SCOPE)) {
      // Relation-only update on purpose: `repository.save(adminUser)` would
      // re-trigger @BeforeUpdate hashPassword() and double-hash the password,
      // breaking login on the second `seed:run`.
      await repository
        .createQueryBuilder()
        .relation(UserEntity, 'scopes')
        .of(adminUser)
        .add(adminScope);
    }
  }
}
