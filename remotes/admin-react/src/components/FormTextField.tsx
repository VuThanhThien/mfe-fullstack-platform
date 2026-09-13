import { TextField } from '@mui/material';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

interface FormTextFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
  /** Shown while the field is valid; a zod message replaces it on error. */
  hint?: string;
  type?: 'text' | 'email' | 'password';
  required?: boolean;
  multiline?: boolean;
  minRows?: number;
  disabled?: boolean;
}

/** MUI `TextField` wired through `Controller` (§2.9: `register()` drops MUI's ref). */
export function FormTextField<TValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  type,
  required,
  multiline,
  minRows,
  disabled,
}: FormTextFieldProps<TValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          type={type}
          required={required}
          multiline={multiline}
          minRows={minRows}
          disabled={disabled}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? hint}
          fullWidth
        />
      )}
    />
  );
}
