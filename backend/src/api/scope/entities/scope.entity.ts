import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { UserEntity } from '@/api/user/entities/user.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

/**
 * A scope is the single authorization primitive of this service.
 * It is intentionally *not* soft-deletable: entitlements must not silently
 * survive (or vanish behind) a deleted row — see the RESTRICT FKs on the
 * join tables, which force an application-level 409 instead.
 */
@Entity('scope')
export class ScopeEntity extends AbstractEntity {
  constructor(data?: Partial<ScopeEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_scope_id' })
  id!: Uuid;

  @Column({ length: 50 })
  @Index('UQ_scope_name', { unique: true })
  name!: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @ManyToMany(() => UserEntity, (user) => user.scopes)
  users?: Relation<UserEntity[]>;

  @ManyToMany(() => MfeConfigEntity, (mfeConfig) => mfeConfig.scopes)
  mfeConfigs?: Relation<MfeConfigEntity[]>;
}
