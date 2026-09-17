import { MfeConfigEntity } from '@/api/mfe-config/entities/mfe-config.entity';
import { ScopeEntity } from '@/api/scope/entities/scope.entity';
import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { MfeNavItemType } from '../mfe-nav-item.constants';

type NavConfigRelation = MfeConfigEntity;
type NavParentRelation = MfeNavItemEntity;

/**
 * One node in an MfeConfig's sidebar tree. Owning side of
 * `mfe_nav_item_scope`: deleting a node (or its config/parent) cascades the
 * grants; a scope still referenced cannot be deleted (NO ACTION → 409).
 */
@Index('IDX_mfe_nav_item_mfe_config_id', ['mfeConfigId'])
@Index('IDX_mfe_nav_item_parent_id', ['parentId'])
@Index('IDX_mfe_nav_item_config_parent_sort', [
  'mfeConfigId',
  'parentId',
  'sortOrder',
])
@Entity('mfe_nav_item')
export class MfeNavItemEntity extends AbstractEntity {
  constructor(data?: Partial<MfeNavItemEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_mfe_nav_item_id',
  })
  id!: Uuid;

  @Column({ name: 'mfe_config_id', type: 'uuid' })
  mfeConfigId!: Uuid;

  @JoinColumn({
    name: 'mfe_config_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_mfe_nav_item_mfe_config_id',
  })
  @ManyToOne(() => MfeConfigEntity, {
    onDelete: 'CASCADE',
  })
  mfeConfig!: Relation<NavConfigRelation>;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: Uuid | null;

  @JoinColumn({
    name: 'parent_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_mfe_nav_item_parent_id',
  })
  @ManyToOne(() => MfeNavItemEntity, (item) => item.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  parent?: Relation<NavParentRelation | null>;

  @OneToMany(() => MfeNavItemEntity, (item) => item.parent)
  children?: Relation<MfeNavItemEntity[]>;

  @Column({ name: 'type', type: 'varchar', length: 10 })
  type!: MfeNavItemType;

  @Column({ name: 'title', type: 'varchar', length: 80 })
  title!: string;

  @Column({ name: 'path', type: 'varchar', length: 200, nullable: true })
  path!: string | null;

  @Column({ name: 'icon_url', type: 'varchar', length: 2048, nullable: true })
  iconUrl!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToMany(() => ScopeEntity)
  @JoinTable({
    name: 'mfe_nav_item_scope',
    joinColumn: {
      name: 'mfe_nav_item_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_mfe_nav_item_scope_mfe_nav_item_id',
    },
    inverseJoinColumn: {
      name: 'scope_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_mfe_nav_item_scope_scope_id',
    },
  })
  scopes!: Relation<ScopeEntity[]>;
}
