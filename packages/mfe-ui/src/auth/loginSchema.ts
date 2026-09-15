import { z } from 'zod';

/**
 * Login field rules — mirror landing/backend expectations for email presence.
 * Password rules on login are intentionally lighter than register (server validates).
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
