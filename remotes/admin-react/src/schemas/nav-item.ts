import { z } from 'zod';
import type { CreateMfeNavItemBody, UpdateMfeNavItemBody } from '../lib/types';
import { optionalHttpsIconUrl } from './icon-url';

/** Relative path; empty = app index (`/app/{routeName}`). */
export const NAV_PATH_PATTERN = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export const NAV_ITEM_TYPES = ['group', 'route'] as const;

export const navItemSchema = z
  .object({
    type: z.enum(NAV_ITEM_TYPES),
    title: z.string().min(1, 'Title is required').max(80),
    path: z.string().max(200).optional(),
    iconUrl: optionalHttpsIconUrl.optional(),
    parentId: z.string().optional(),
    scopeNames: z.array(z.string().min(1)).min(1, 'Select at least one scope'),
  })
  .superRefine((values, ctx) => {
    const path = values.path?.trim() ?? '';
    if (values.type === 'route') {
      if (path !== '' && !NAV_PATH_PATTERN.test(path)) {
        ctx.addIssue({
          code: 'custom',
          path: ['path'],
          message:
            'Leave blank for app index, or use a relative path (no leading slash)',
        });
      }
      return;
    }
    if (path) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: 'group nodes must not have a path',
      });
    }
  });

export type NavItemForm = z.infer<typeof navItemSchema>;

export const emptyNavItemForm = (): NavItemForm => ({
  type: 'route',
  title: '',
  path: '',
  iconUrl: '',
  parentId: '',
  scopeNames: [],
});

export function toCreateNavItemBody(
  values: NavItemForm,
  sortOrder?: number,
): CreateMfeNavItemBody {
  const body: CreateMfeNavItemBody = {
    type: values.type,
    title: values.title.trim(),
    scopeNames: values.scopeNames,
  };
  if (values.type === 'route') {
    body.path = values.path?.trim() ?? '';
  }
  const iconUrl = values.iconUrl?.trim();
  if (iconUrl) body.iconUrl = iconUrl;
  if (values.parentId) body.parentId = values.parentId;
  if (sortOrder !== undefined) body.sortOrder = sortOrder;
  return body;
}

export function toUpdateNavItemBody(values: NavItemForm): UpdateMfeNavItemBody {
  const iconUrl = values.iconUrl?.trim();
  return {
    type: values.type,
    title: values.title.trim(),
    path: values.type === 'route' ? (values.path?.trim() ?? '') : null,
    iconUrl: iconUrl || null,
    parentId: values.parentId ? values.parentId : null,
    scopeNames: values.scopeNames,
  };
}
