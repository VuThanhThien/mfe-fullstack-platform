import { Uuid } from '@/common/types/common.type';
import { AbstractEntity } from '@/database/entities/abstract.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * `user` and `session` import each other. With `emitDecoratorMetadata`, a plain
 * `user!: UserEntity` annotation compiles into an *eager* `design:type` read,
 * which hits the temporal dead zone and throws "Cannot access 'UserEntity'
 * before initialization" whenever `user.entity` is evaluated first.
 *
 * Going through an alias keeps the property fully typed while making the
 * emitted metadata reference a name that does not exist at runtime (so the
 * generated `typeof` guard falls back to `Object`). TypeORM derives the
 * relation target from the lazy `() => UserEntity` factory either way.
 */
type SessionUserRelation = UserEntity;

@Entity('session')
export class SessionEntity extends AbstractEntity {
  constructor(data?: Partial<SessionEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_session_id',
  })
  id!: Uuid;

  @Column({
    name: 'hash',
    type: 'varchar',
    length: 255,
  })
  hash!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: Uuid;

  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_session_user',
  })
  @ManyToOne(() => UserEntity, (user) => user.sessions)
  user!: Relation<SessionUserRelation>;
}
