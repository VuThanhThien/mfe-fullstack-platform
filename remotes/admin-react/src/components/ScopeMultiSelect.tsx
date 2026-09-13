import {
  Checkbox,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
} from '@mui/material';
import { useId } from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import type { ScopeDto } from '../lib/types';

interface ScopeMultiSelectProps<TValues extends FieldValues> {
  control: Control<TValues>;
  /** Field holding `string[]` of scope names. */
  name: FieldPath<TValues>;
  options: ScopeDto[];
  required?: boolean;
  /** Shown while the field is valid; a zod message replaces it on error. */
  hint?: string;
}

/** Scope-name multi-select wired through `Controller`. */
export function ScopeMultiSelect<TValues extends FieldValues>({
  control,
  name,
  options,
  required,
  hint,
}: ScopeMultiSelectProps<TValues>) {
  const labelId = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selected: string[] = field.value ?? [];
        const helperText = fieldState.error?.message ?? hint;

        return (
          <FormControl
            fullWidth
            required={required}
            error={Boolean(fieldState.error)}
          >
            <InputLabel id={labelId}>Scopes</InputLabel>
            <Select
              labelId={labelId}
              multiple
              value={selected}
              onBlur={field.onBlur}
              onChange={(event) => {
                const next = event.target.value;
                field.onChange(
                  typeof next === 'string' ? next.split(',') : next,
                );
              }}
              input={<OutlinedInput label="Scopes" />}
              renderValue={(names) => names.join(', ')}
            >
              {options.map((scope) => (
                <MenuItem key={scope.id} value={scope.name}>
                  <Checkbox checked={selected.includes(scope.name)} />
                  <ListItemText
                    primary={scope.name}
                    secondary={scope.description || undefined}
                  />
                </MenuItem>
              ))}
            </Select>
            {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
          </FormControl>
        );
      }}
    />
  );
}
