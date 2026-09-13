import { z } from 'zod';
import { FRAMEWORKS } from '../lib/constants';

const ROUTE_NAME_PATTERN = /^[a-z0-9-]{2,40}$/;

export const createConfigSchema = z.object({
  remoteEntry: z
    .string()
    .min(1, 'remoteEntry is required')
    .url('Must be an absolute URL with protocol'),
  remoteName: z.string().min(1, 'remoteName is required'),
  exposedModule: z.string().min(1, 'exposedModule is required'),
  routeName: z
    .string()
    .min(2)
    .max(40)
    .transform((v) => v.toLowerCase())
    .refine((v) => ROUTE_NAME_PATTERN.test(v), {
      message: 'routeName must match ^[a-z0-9-]{2,40}$',
    }),
  title: z.string().min(1).max(80),
  framework: z.enum(FRAMEWORKS),
  scopeNames: z.array(z.string().min(1)).min(1, 'Select at least one scope'),
});

export const updateConfigSchema = createConfigSchema.partial().extend({
  scopeNames: z
    .array(z.string().min(1))
    .min(1, 'Select at least one scope')
    .optional(),
});

export type CreateConfigForm = z.infer<typeof createConfigSchema>;
export type UpdateConfigForm = z.infer<typeof updateConfigSchema>;
