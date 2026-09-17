import {
  ClassField,
  EnumField,
  NumberField,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { MfeNavItemType } from '../mfe-nav-item.constants';

@Exclude()
export class MfeNavItemResDto {
  @UUIDField()
  @Expose()
  id: string;

  @EnumField(() => MfeNavItemType)
  @Expose()
  type: MfeNavItemType;

  @StringField()
  @Expose()
  title: string;

  @StringFieldOptional()
  @Expose()
  path?: string | null;

  @StringFieldOptional()
  @Expose()
  iconUrl?: string | null;

  @UUIDFieldOptional({ nullable: true })
  @Expose()
  parentId?: string | null;

  @NumberField({ int: true })
  @Expose()
  sortOrder: number;

  @StringField({ each: true, isArray: true })
  @Expose()
  scopeNames: string[];

  @ClassField(() => MfeNavItemResDto, { each: true, isArray: true })
  @Expose()
  children: MfeNavItemResDto[];
}
