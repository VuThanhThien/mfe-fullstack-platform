import { ScopeResDto } from '@/api/scope/dto/scope.res.dto';
import { WrapperType } from '@/common/types/types';
import {
  ClassFieldOptional,
  DateField,
  StringField,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class MfeConfigResDto {
  @UUIDField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  remoteEntry: string;

  @StringField()
  @Expose()
  remoteName: string;

  @StringField()
  @Expose()
  exposedModule: string;

  @StringField()
  @Expose()
  routeName: string;

  @StringField()
  @Expose()
  title: string;

  @StringField()
  @Expose()
  framework: string;

  /**
   * Omitted by `GET /mfe-configs/accessible` (the caller's own scopes are
   * implicit there); populated by the admin endpoints.
   */
  @ClassFieldOptional(() => ScopeResDto, { each: true, isArray: true })
  @Expose()
  scopes?: WrapperType<ScopeResDto[]>;

  @DateField()
  @Expose()
  createdAt: Date;

  @DateField()
  @Expose()
  updatedAt: Date;
}
