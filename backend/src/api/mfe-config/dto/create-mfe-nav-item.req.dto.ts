import {
  EnumField,
  NumberFieldOptional,
  StringField,
  URLFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ArrayNotEmpty, Matches, Validate, ValidateIf } from 'class-validator';
import {
  HTTPS_ICON_URL_OPTIONS,
  MFE_NAV_PATH_PATTERN,
  MFE_NAV_PATH_PATTERN_MESSAGE,
  MfeNavItemType,
} from '../mfe-nav-item.constants';
import { NavItemPathByTypeConstraint } from '../validators/nav-item-path-by-type.validator';

export class CreateMfeNavItemReqDto {
  @EnumField(() => MfeNavItemType, {
    example: MfeNavItemType.Route,
    description: 'group = folder chrome; route = leaf with a relative path',
  })
  @Validate(NavItemPathByTypeConstraint)
  type: MfeNavItemType;

  @StringField({
    minLength: 1,
    maxLength: 80,
    example: 'Product list',
  })
  title: string;

  @ValidateIf((o: CreateMfeNavItemReqDto) => o.type === MfeNavItemType.Route)
  @StringField({
    minLength: 0,
    maxLength: 200,
    example: 'categories',
    description:
      'Relative path under /app/{routeName}/. Empty string = app index. Forbidden for group.',
  })
  @ValidateIf(
    (o: CreateMfeNavItemReqDto) =>
      o.type === MfeNavItemType.Route && Boolean(o.path),
  )
  @Matches(MFE_NAV_PATH_PATTERN, { message: MFE_NAV_PATH_PATTERN_MESSAGE })
  path?: string;

  @URLFieldOptional({
    urlOptions: HTTPS_ICON_URL_OPTIONS,
    maxLength: 2048,
    example: 'https://example.com/icons/list.png',
    description: 'HTTPS URL for the node icon.',
  })
  iconUrl?: string;

  @UUIDFieldOptional({
    description: 'Parent node id. Omit or null for a root node.',
  })
  parentId?: string;

  @NumberFieldOptional({
    int: true,
    min: 0,
    example: 0,
    description: 'Sibling sort key. Defaults to 0.',
  })
  sortOrder?: number;

  @StringField({
    each: true,
    minLength: 1,
    toUpperCase: true,
    example: ['DASHBOARD'],
    description:
      'Scope names that may see this node. Must already exist (no implicit creation).',
  })
  @ArrayNotEmpty()
  scopeNames: string[];
}
