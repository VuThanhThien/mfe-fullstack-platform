import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

/**
 * A single micro-frontend remote the shell is allowed to load.
 * Owning side of the `mfe_config_scope` join table: a config is deleted with
 * its grants (CASCADE), while a scope cannot be deleted while configs use it
 * (RESTRICT -> application-level 409).
 */
@Entity('mfe_config')
export class MfeConfigEntity extends AbstractEntity {
  constructor(data?: Partial<MfeConfigEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_mfe_config_id',
  })
  id!: Uuid;

  @Column({ name: 'remote_entry' })
  @Index('UQ_mfe_config_remote_entry', { unique: true })
  remoteEntry!: string;

  @Column({ name: 'remote_name' })
  @Index('UQ_mfe_config_remote_name', { unique: true })
  remoteName!: string;

  @Column({ name: 'exposed_module' })
  exposedModule!: string;

  @Column({ name: 'route_name', length: 40 })
  @Index('UQ_mfe_config_route_name', { unique: true })
  routeName!: string;

  @Column({ name: 'title', length: 80 })
  title!: string;

  @Column({ name: 'framework', length: 20 })
  framework!: string;

  @ManyToMany(() => ScopeEntity, (scope) => scope.mfeConfigs)
  @JoinTable({
    name: 'mfe_config_scope',
    joinColumn: {
      name: 'mfe_config_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_mfe_config_scope_mfe_config_id',
    },
    inverseJoinColumn: {
      name: 'scope_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_mfe_config_scope_scope_id',
    },
  })
  scopes: Relation<ScopeEntity[]>;
}
