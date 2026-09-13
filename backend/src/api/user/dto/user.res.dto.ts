import { ScopeResDto } from '@/api/scope/dto/scope.res.dto';
import { WrapperType } from '@/common/types/types';
import {
  ClassField,
  ClassFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResDto {
  @StringField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  username: string;

  @StringField()
  @Expose()
  email: string;

  @StringFieldOptional()
  @Expose()
  bio?: string;

  @StringField()
  @Expose()
  image: string;

  /** Scopes granted to the user. Loaded explicitly, never eager. */
  @ClassFieldOptional(() => ScopeResDto, { each: true, isArray: true })
  @Expose()
  scopes?: WrapperType<ScopeResDto[]>;

  @ClassField(() => Date)
  @Expose()
  createdAt: Date;

  @ClassField(() => Date)
  @Expose()
  updatedAt: Date;
}
