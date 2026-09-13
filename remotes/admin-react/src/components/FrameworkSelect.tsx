import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { useId } from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { FRAMEWORKS } from '../lib/constants';

interface FrameworkSelectProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: FieldPath<TValues>;
}

/** Framework picker for MfeConfig forms; options mirror the backend enum. */
export function FrameworkSelect<TValues extends FieldValues>({
  control,
  name,
}: FrameworkSelectProps<TValues>) {
  const labelId = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={Boolean(fieldState.error)}>
          <InputLabel id={labelId}>Framework</InputLabel>
          <Select {...field} labelId={labelId} label="Framework">
            {FRAMEWORKS.map((framework) => (
              <MenuItem key={framework} value={framework}>
                {framework}
              </MenuItem>
            ))}
          </Select>
          {fieldState.error ? (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          ) : null}
        </FormControl>
      )}
    />
  );
}
