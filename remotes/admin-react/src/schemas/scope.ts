import { z } from 'zod';

/** Mirrors backend SCOPE_NAME_PATTERN after toUpperCase. */
const SCOPE_NAME_PATTERN = /^[A-Z0-9_:.-]{2,50}$/;

export const createScopeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .transform((v) => v.toUpperCase())
    .refine((v) => SCOPE_NAME_PATTERN.test(v), {
      message: 'Name must match ^[A-Z0-9_:.-]{2,50}$',
    }),
  description: z.string().max(255).optional(),
});

export const updateScopeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .transform((v) => v.toUpperCase())
    .refine((v) => SCOPE_NAME_PATTERN.test(v), {
      message: 'Name must match ^[A-Z0-9_:.-]{2,50}$',
    })
    .optional(),
  description: z.string().max(255).optional(),
});

export type CreateScopeForm = z.infer<typeof createScopeSchema>;
export type UpdateScopeForm = z.infer<typeof updateScopeSchema>;
