import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `route_name`, `title`, `framework` to `mfe_config`.
 * Also promotes `remote_name` to unique (previously non-unique in Phase B).
 */
export class AddMfeConfigRouteMetadata1789171200003
  implements MigrationInterface
{
  name = 'AddMfeConfigRouteMetadata1789171200003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mfe_config"
        ADD COLUMN "route_name" character varying(40) NOT NULL DEFAULT '',
        ADD COLUMN "title" character varying(80) NOT NULL DEFAULT '',
        ADD COLUMN "framework" character varying(20) NOT NULL DEFAULT 'react'
    `);
    // Remove the temporary defaults now that the column exists
    await queryRunner.query(`
      ALTER TABLE "mfe_config"
        ALTER COLUMN "route_name" DROP DEFAULT,
        ALTER COLUMN "title" DROP DEFAULT,
        ALTER COLUMN "framework" DROP DEFAULT
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_route_name" ON "mfe_config" ("route_name")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_remote_name" ON "mfe_config" ("remote_name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_mfe_config_remote_name"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_mfe_config_route_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_config"
        DROP COLUMN "framework",
        DROP COLUMN "title",
        DROP COLUMN "route_name"
    `);
  }
}
