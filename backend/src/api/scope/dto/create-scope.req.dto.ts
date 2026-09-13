import {
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { Matches } from 'class-validator';

/**
 * Scope names are uppercase, 2-50 chars, and restricted to a conservative
 * charset. The value is compared inside authorization checks, so it is never
 * interpolated into SQL — this is a defence-in-depth constraint, not the only one.
 */
export const SCOPE_NAME_PATTERN = /^[A-Z0-9_:.-]{2,50}$/;

export class CreateScopeReqDto {
  @StringField({
    minLength: 2,
    maxLength: 50,
    toUpperCase: true,
    example: 'DASHBOARD',
    description: 'Uppercase scope name',
  })
  @Matches(SCOPE_NAME_PATTERN, {
    message: 'name must match ^[A-Z0-9_:.-]{2,50}$',
  })
  name: string;

  @StringFieldOptional({ maxLength: 255 })
  description?: string;
}
