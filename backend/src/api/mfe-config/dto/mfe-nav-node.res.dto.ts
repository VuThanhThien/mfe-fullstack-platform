import {
  ClassField,
  EnumField,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';
import { MfeNavItemType } from '../mfe-nav-item.constants';

/** Filtered tree node returned by `GET .../nav/accessible`. Scopes omitted. */
@Exclude()
export class MfeNavNodeResDto {
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

  @ClassField(() => MfeNavNodeResDto, { each: true, isArray: true })
  @Expose()
  children: MfeNavNodeResDto[];
}
