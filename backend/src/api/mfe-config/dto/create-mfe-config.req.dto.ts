import {
  StringField,
  URLField,
  URLFieldOptional,
} from '@/decorators/field.decorators';
import { ArrayNotEmpty, IsIn, Matches } from 'class-validator';
import { HTTPS_ICON_URL_OPTIONS } from '../mfe-nav-item.constants';

export const MFE_FRAMEWORKS = ['react', 'vue', 'angular'] as const;
export type MfeFramework = (typeof MFE_FRAMEWORKS)[number];

/** Shell router slug — blocks path traversal / open redirects via Link `to`. */
export const MFE_ROUTE_NAME_PATTERN = /^[a-z0-9-]{2,40}$/;

export class CreateMfeConfigReqDto {
  @URLField({
    // Absolute URL required; TLD not required so dev/internal remotes
    // (http://localhost:..., http://dashboard-remote/...) are accepted.
    urlOptions: { require_tld: false, require_protocol: true },
    example: 'http://localhost:3001/remoteEntry.js',
    description: 'URL of the remote entry the shell loads at runtime',
  })
  remoteEntry: string;

  @StringField({ example: 'dashboard' })
  remoteName: string;

  @StringField({ example: './DashboardModule' })
  exposedModule: string;

  @StringField({
    minLength: 2,
    maxLength: 40,
    toLowerCase: true,
    example: 'dashboard',
    description:
      'Slug used in the shell router. Lowercase alphanumeric + hyphens (2-40 chars).',
  })
  @Matches(MFE_ROUTE_NAME_PATTERN, {
    message: 'routeName must match ^[a-z0-9-]{2,40}$',
  })
  routeName: string;

  @StringField({
    minLength: 1,
    maxLength: 80,
    example: 'Dashboard',
    description: 'Human-readable title displayed in the shell nav.',
  })
  title: string;

  @StringField({
    example: 'react',
    description: 'Frontend framework: react | vue | angular',
  })
  @IsIn(MFE_FRAMEWORKS, {
    message: `framework must be one of: ${MFE_FRAMEWORKS.join(', ')}`,
  })
  framework: MfeFramework;

  @URLFieldOptional({
    urlOptions: HTTPS_ICON_URL_OPTIONS,
    maxLength: 2048,
    example: 'https://example.com/icons/product.png',
    description: 'HTTPS URL for the launcher tile icon.',
  })
  iconUrl?: string;

  @StringField({
    each: true,
    minLength: 1,
    // Scope names are stored uppercase; normalise so `['dashboard']` resolves.
    toUpperCase: true,
    example: ['DASHBOARD'],
    description:
      'Scope names that may see this config. Must already exist (no implicit creation).',
  })
  @ArrayNotEmpty()
  scopeNames: string[];
}
