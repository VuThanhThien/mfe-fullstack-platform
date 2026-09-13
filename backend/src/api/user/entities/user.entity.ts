import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import { hashPassword as hashPass } from '@/utils/password.util';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { SessionEntity } from './session.entity';

@Entity('user')
export class UserEntity extends AbstractEntity {
  constructor(data?: Partial<UserEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_user_id' })
  id!: Uuid;

  @Column({
    length: 50,
    nullable: true,
  })
  @Index('UQ_user_username', {
    where: '"deleted_at" IS NULL',
    unique: true,
  })
  username: string;

  @Column()
  @Index('UQ_user_email', { where: '"deleted_at" IS NULL', unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: '' })
  bio?: string;

  @Column({ default: '' })
  image?: string;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    default: null,
  })
  deletedAt: Date;

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions?: SessionEntity[];

  /**
   * Owning side of `user_scope`. Deliberately not eager: every authorization
   * path that must be exact loads it explicitly (login/refresh, `accessible`).
   * TypeORM owns the join-table FK/index names here (`@JoinTable` cannot express
   * `onDelete`), so the migration mirrors its generated DDL: deleting a user
   * cascades its grants, while a scope in use stays RESTRICTed.
   */
  @ManyToMany(() => ScopeEntity, (scope) => scope.users)
  @JoinTable({
    name: 'user_scope',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_scope_user_id',
    },
    inverseJoinColumn: {
      name: 'scope_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_scope_scope_id',
    },
  })
  scopes?: Relation<ScopeEntity[]>;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await hashPass(this.password);
    }
  }
}
