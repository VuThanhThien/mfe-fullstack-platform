import { z } from 'zod';

/** HTTPS-only icon URL; empty string means “unset” in the form. */
export const optionalHttpsIconUrl = z
  .string()
  .max(2048, 'iconUrl must be at most 2048 characters')
  .refine(
    (value) => {
      const trimmed = value.trim();
      if (trimmed === '') return true;
      try {
        return new URL(trimmed).protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid HTTPS URL' },
  );
