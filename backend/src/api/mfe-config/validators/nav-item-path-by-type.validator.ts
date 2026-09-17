import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';
import {
  isValidNavRoutePath,
  MFE_NAV_PATH_PATTERN_MESSAGE,
  MfeNavItemType,
} from '../mfe-nav-item.constants';

/**
 * Create DTO: `route` path is string (empty = app index); `group` must not send one.
 * Update DTO is partial — the service re-validates after merge.
 */
@ValidatorConstraint({ name: 'navItemPathByType', async: false })
export class NavItemPathByTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { type?: MfeNavItemType; path?: string | null };
    if (obj.type === MfeNavItemType.Route) {
      return typeof obj.path === 'string' && isValidNavRoutePath(obj.path);
    }
    if (obj.type === MfeNavItemType.Group) {
      return obj.path == null || obj.path === '';
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { type?: MfeNavItemType };
    if (obj.type === MfeNavItemType.Route) {
      return `path ${MFE_NAV_PATH_PATTERN_MESSAGE}`;
    }
    return 'group nodes must not have a path';
  }
}
