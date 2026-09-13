import {
  DateField,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '@/decorators/field.decorators';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ScopeResDto {
  @UUIDField()
  @Expose()
  id: string;

  @StringField()
  @Expose()
  name: string;

  @StringFieldOptional()
  @Expose()
  description?: string;

  @DateField()
  @Expose()
  createdAt: Date;

  @DateField()
  @Expose()
  updatedAt: Date;
}
