import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds nullable `icon_url` on `mfe_config`, plus the adjacency-list nav tree
 * (`mfe_nav_item`) and its scope join (`mfe_nav_item_scope`).
 *
 * Join-table FKs mirror `mfe_config_scope`: owner CASCADE, scope NO ACTION.
 * Children cascade with their parent; items cascade with the owning config.
 */
export class MfeNavItemAndIconUrl1789171200005 implements MigrationInterface {
  name = 'MfeNavItemAndIconUrl1789171200005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mfe_config"
      ADD COLUMN "icon_url" character varying(2048)
    `);

    await queryRunner.query(`
      CREATE TABLE "mfe_nav_item" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mfe_config_id" uuid NOT NULL,
        "parent_id" uuid,
        "type" character varying(10) NOT NULL,
        "title" character varying(80) NOT NULL,
        "path" character varying(200),
        "icon_url" character varying(2048),
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_by" character varying NOT NULL,
        CONSTRAINT "PK_mfe_nav_item_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_mfe_nav_item_type" CHECK ("type" IN ('group', 'route')),
        CONSTRAINT "CK_mfe_nav_item_path_by_type" CHECK (
          ("type" = 'route' AND "path" IS NOT NULL) OR
          ("type" = 'group' AND "path" IS NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_mfe_nav_item_mfe_config_id"
      ON "mfe_nav_item" ("mfe_config_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mfe_nav_item_parent_id"
      ON "mfe_nav_item" ("parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mfe_nav_item_config_parent_sort"
      ON "mfe_nav_item" ("mfe_config_id", "parent_id", "sort_order")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mfe_nav_item_sibling_path"
      ON "mfe_nav_item" (
        "mfe_config_id",
        COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'),
        "path"
      )
      WHERE "type" = 'route' AND "path" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item"
      ADD CONSTRAINT "FK_mfe_nav_item_mfe_config_id"
      FOREIGN KEY ("mfe_config_id") REFERENCES "mfe_config"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item"
      ADD CONSTRAINT "FK_mfe_nav_item_parent_id"
      FOREIGN KEY ("parent_id") REFERENCES "mfe_nav_item"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "mfe_nav_item_scope" (
        "mfe_nav_item_id" uuid NOT NULL,
        "scope_id" uuid NOT NULL,
        CONSTRAINT "PK_mfe_nav_item_scope" PRIMARY KEY ("mfe_nav_item_id", "scope_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mfe_nav_item_scope_mfe_nav_item_id"
      ON "mfe_nav_item_scope" ("mfe_nav_item_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_mfe_nav_item_scope_scope_id"
      ON "mfe_nav_item_scope" ("scope_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item_scope"
      ADD CONSTRAINT "FK_mfe_nav_item_scope_mfe_nav_item_id"
      FOREIGN KEY ("mfe_nav_item_id") REFERENCES "mfe_nav_item"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item_scope"
      ADD CONSTRAINT "FK_mfe_nav_item_scope_scope_id"
      FOREIGN KEY ("scope_id") REFERENCES "scope"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item_scope"
      DROP CONSTRAINT "FK_mfe_nav_item_scope_scope_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item_scope"
      DROP CONSTRAINT "FK_mfe_nav_item_scope_mfe_nav_item_id"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_mfe_nav_item_scope_scope_id"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_mfe_nav_item_scope_mfe_nav_item_id"
    `);
    await queryRunner.query(`
      DROP TABLE "mfe_nav_item_scope"
    `);

    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item" DROP CONSTRAINT "FK_mfe_nav_item_parent_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "mfe_nav_item" DROP CONSTRAINT "FK_mfe_nav_item_mfe_config_id"
    `);
    await queryRunner.query(`
      DROP INDEX "UQ_mfe_nav_item_sibling_path"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_mfe_nav_item_config_parent_sort"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_mfe_nav_item_parent_id"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_mfe_nav_item_mfe_config_id"
    `);
    await queryRunner.query(`
      DROP TABLE "mfe_nav_item"
    `);

    await queryRunner.query(`
      ALTER TABLE "mfe_config" DROP COLUMN "icon_url"
    `);
  }
}
