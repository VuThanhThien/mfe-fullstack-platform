import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `mfe_config` plus `mfe_config_scope` — the implicit junction table of
 * `MfeConfigEntity.scopes`. Names mirror TypeORM's generated DDL (see
 * CreateUserScopeTable1789171200001 for why the junction names are hashed).
 */
export class CreateMfeConfigTables1789171200002 implements MigrationInterface {
  name = 'CreateMfeConfigTables1789171200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mfe_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "remote_entry" character varying NOT NULL,
        "remote_name" character varying NOT NULL,
        "exposed_module" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_by" character varying NOT NULL,
        CONSTRAINT "PK_mfe_config_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_config_remote_entry" ON "mfe_config" ("remote_entry")
    `);
    await queryRunner.query(`
      CREATE TABLE "mfe_config_scope" (
        "mfe_config_id" uuid NOT NULL,
        "scope_id" uuid NOT NULL,
        CONSTRAINT "PK_4fd946db1c7d374e9e743498dd2" PRIMARY KEY ("mfe_config_id", "scope_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_1cdb0692bd4d9d5a702a375fa1" ON "mfe_config_scope" ("mfe_config_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_eed4568bc060d052cb1997857a" ON "mfe_config_scope" ("scope_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_config_scope"
      ADD CONSTRAINT "FK_mfe_config_scope_mfe_config_id" FOREIGN KEY ("mfe_config_id") REFERENCES "mfe_config"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_config_scope"
      ADD CONSTRAINT "FK_mfe_config_scope_scope_id" FOREIGN KEY ("scope_id") REFERENCES "scope"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mfe_config_scope" DROP CONSTRAINT "FK_mfe_config_scope_scope_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_config_scope" DROP CONSTRAINT "FK_mfe_config_scope_mfe_config_id"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_eed4568bc060d052cb1997857a"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_1cdb0692bd4d9d5a702a375fa1"
    `);
    await queryRunner.query(`
      DROP TABLE "mfe_config_scope"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_mfe_config_remote_entry"
    `);
    await queryRunner.query(`
      DROP TABLE "mfe_config"
    `);
  }
}
