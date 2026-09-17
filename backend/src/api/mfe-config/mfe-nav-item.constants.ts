export enum MfeNavItemType {
  Group = 'group',
  Route = 'route',
}

/**
 * Relative path for `route` nodes — no leading slash, no `..`.
 * Empty string = app index (`/app/{routeName}`).
 */
export const MFE_NAV_PATH_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export const MFE_NAV_PATH_PATTERN_MESSAGE =
  'path must be empty (app index) or match ^[a-z0-9-]+(?:/[a-z0-9-]+)*$';

export function isValidNavRoutePath(path: string): boolean {
  return path === '' || MFE_NAV_PATH_PATTERN.test(path);
}

/** Server-side cap; admin UX recommends ≤ 3. */
export const MFE_NAV_MAX_DEPTH = 5;

export const HTTPS_ICON_URL_OPTIONS = {
  protocols: ['https'],
  require_protocol: true,
};
