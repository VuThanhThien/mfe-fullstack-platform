import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-surface remotes share one `remote_entry` + `remote_name` across
 * several `MfeConfig` rows (different `exposed_module` / `route_name`).
 * Keep uniqueness on `route_name` and on (`remote_name`, `exposed_module`).
 */
export class MfeConfigMultiSurfaceUniques1789171200004
  implements MigrationInterface
{
  name = 'MfeConfigMultiSurfaceUniques1789171200004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_mfe_config_remote_entry"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_mfe_config_remote_name"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_remote_expose"
      ON "mfe_config" ("remote_name", "exposed_module")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_mfe_config_remote_expose"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_remote_entry" ON "mfe_config" ("remote_entry")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_remote_name" ON "mfe_config" ("remote_name")
    `);
  }
}
