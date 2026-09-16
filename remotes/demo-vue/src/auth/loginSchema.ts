import { z } from 'zod';

/**
 * Mirror `@mfe/ui/auth` loginSchema — local copy (Vue cannot import that package).
 * Password rules on login are intentionally lighter than register.
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
