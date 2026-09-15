import { z } from 'zod';

/**
 * Register form schemas — mirror backend DTOs
 * (`backend/src/decorators/field.decorators.ts`).
 *
 * Login schema lives in `@mfe/ui` (`loginSchema`) so landing/remotes do not drift.
 */

/** Matches `PasswordField()`'s `minLength: 6` in the backend DTO. */
export const PASSWORD_MIN_LENGTH = 6;

/** Backend `IsPassword()` charset: digits, letters and ! # $ % & * @ ^ only. */
const PASSWORD_ALLOWED_CHARS = /^[\d!#$%&*@A-Z^a-z]*$/;

const emailField = z.email('Enter a valid email address');

const passwordField = z
  .string()
  .min(1, 'Password is required')
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .regex(
    PASSWORD_ALLOWED_CHARS,
    'Password may only contain letters, numbers and ! # $ % & * @ ^',
  );

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type RegisterForm = z.infer<typeof registerSchema>;

/** Re-export for callers that still import login types from this module. */
export { loginSchema, type LoginFormValues as LoginForm } from '@mfe/ui';
