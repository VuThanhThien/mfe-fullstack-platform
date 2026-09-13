import {
  EmailField,
  PasswordField,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty } from 'class-validator';

export class CreateUserReqDto {
  @StringField()
  @Transform(lowerCaseTransformer)
  username: string;

  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  @StringFieldOptional()
  bio?: string;

  @StringFieldOptional()
  image?: string;

  /**
   * Scope names to grant. Optional on create (omitted -> no scopes); an empty
   * array is rejected with 422. Unknown names -> 400.
   *
   * Uppercased on the way in, matching `CreateScopeReqDto.name`: scope names are
   * stored uppercase, so `['dashboard']` must resolve rather than 400.
   */
  @StringFieldOptional({
    each: true,
    minLength: 1,
    toUpperCase: true,
    example: ['DASHBOARD'],
  })
  @ArrayNotEmpty()
  scopeNames?: string[];
}
