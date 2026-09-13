import { z } from 'zod';

/** Matches backend PasswordField minLength: 6 + IsPassword charset. */
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_ALLOWED_CHARS = /^[\d!#$%&*@A-Z^a-z]*$/;

export const createUserSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .transform((v) => v.toLowerCase()),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(
      PASSWORD_ALLOWED_CHARS,
      'Password may only contain letters, numbers and ! # $ % & * @ ^',
    ),
  bio: z.string().optional(),
  image: z.string().optional(),
  scopeNames: z.array(z.string().min(1)).optional(),
});

export const updateUserSchema = z.object({
  bio: z.string().optional(),
  image: z.string().optional(),
  scopeNames: z.array(z.string().min(1)).optional(),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type UpdateUserForm = z.infer<typeof updateUserSchema>;
