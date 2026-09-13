import { NumberField, StringField } from '@/decorators/field.decorators';

export class RefreshResDto {
  @StringField()
  userId!: string;

  @StringField()
  accessToken!: string;

  @NumberField()
  tokenExpires!: number;
}
