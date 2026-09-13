import { z } from 'zod';

/**
 * Auth form schemas — the single source of truth for field rules and the
 * inferred TypeScript types used by `useForm`.
 *
 * They deliberately mirror the backend DTOs
 * (`backend/src/decorators/field.decorators.ts`):
 *
 * - `EmailField()`    → a valid email; the backend lower-cases it on the way in.
 * - `PasswordField()` → **min length 6** plus the `IsPassword` charset
 *   `^[\d!#$%&*@A-Z^a-z]*$`.
 *
 * Aligning with the server means the user gets a field-level error instead of a
 * round-trip 422.
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

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
