import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `user_scope` is TypeORM's implicit junction table for the owning
 * `UserEntity.scopes` relation. Its composite-PK and index names are generated
 * by the naming strategy and cannot be customised through `@JoinTable`, so they
 * are mirrored here verbatim to keep `migration:generate` drift-free.
 *
 * FK direction: deleting a user cascades its grants (CASCADE); a scope that is
 * still referenced cannot be deleted (NO ACTION -> Phase 04 returns 409).
 */
export class CreateUserScopeTable1789171200001 implements MigrationInterface {
  name = 'CreateUserScopeTable1789171200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_scope" (
        "user_id" uuid NOT NULL,
        "scope_id" uuid NOT NULL,
        CONSTRAINT "PK_c2cbedcb55084f4f5fe4f28e976" PRIMARY KEY ("user_id", "scope_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cee9702386669ed26c8828f933" ON "user_scope" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ab82699934916641468133ae45" ON "user_scope" ("scope_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "user_scope"
      ADD CONSTRAINT "FK_user_scope_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_scope"
      ADD CONSTRAINT "FK_user_scope_scope_id" FOREIGN KEY ("scope_id") REFERENCES "scope"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_scope" DROP CONSTRAINT "FK_user_scope_scope_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_scope" DROP CONSTRAINT "FK_user_scope_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_ab82699934916641468133ae45"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_cee9702386669ed26c8828f933"
    `);
    await queryRunner.query(`
      DROP TABLE "user_scope"
    `);
  }
}
