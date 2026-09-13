import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScopeTable1789171200000 implements MigrationInterface {
  name = 'CreateScopeTable1789171200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scope" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "description" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_by" character varying NOT NULL,
        CONSTRAINT "PK_scope_id" PRIMARY KEY ("id")
      )
    `);
    // UQ_-prefixed so GlobalExceptionFilter maps a duplicate name to 409.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_scope_name" ON "scope" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_scope_name"
    `);
    await queryRunner.query(`
      DROP TABLE "scope"
    `);
  }
}
