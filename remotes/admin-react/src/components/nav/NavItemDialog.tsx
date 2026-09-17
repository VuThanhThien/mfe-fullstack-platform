import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { useEffect, useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { ScopeDto } from '../../lib/types';
import {
  emptyNavItemForm,
  navItemSchema,
  type NavItemForm,
} from '../../schemas/nav-item';
import { ErrorAlert } from '../ErrorAlert';
import { FormTextField } from '../FormTextField';
import { ScopeMultiSelect } from '../ScopeMultiSelect';

export interface ParentOption {
  id: string;
  label: string;
}

interface NavItemDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: NavItemForm;
  parentOptions: ParentOption[];
  scopeOptions: ScopeDto[];
  scopesError: string | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: NavItemForm) => void;
}

export function NavItemDialog({
  open,
  mode,
  initialValues,
  parentOptions,
  scopeOptions,
  scopesError,
  busy,
  error,
  onClose,
  onSubmit,
}: NavItemDialogProps) {
  const typeLabelId = useId();
  const parentLabelId = useId();

  const { control, handleSubmit, reset, setValue } = useForm<NavItemForm>({
    resolver: zodResolver(navItemSchema),
    defaultValues: emptyNavItemForm(),
  });

  useEffect(() => {
    if (open) reset(initialValues);
  }, [open, initialValues, reset]);

  const type = useWatch({ control, name: 'type' });

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {mode === 'create' ? 'Add nav item' : 'Edit nav item'}
      </DialogTitle>
      <DialogContent>
        <ErrorAlert message={error ?? scopesError} />
        <Stack
          component="form"
          id="nav-item-form"
          onSubmit={handleSubmit(onSubmit)}
          spacing={2}
          sx={{ mt: 1 }}
        >
          <Controller
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id={typeLabelId}>Type</InputLabel>
                <Select
                  {...field}
                  labelId={typeLabelId}
                  label="Type"
                  onChange={(event) => {
                    field.onChange(event);
                    if (event.target.value === 'group') {
                      setValue('path', '');
                    }
                  }}
                >
                  <MenuItem value="route">route (leaf path)</MenuItem>
                  <MenuItem value="group">group (folder)</MenuItem>
                </Select>
                {fieldState.error ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : (
                  <FormHelperText>
                    group = folder chrome; route = relative path under the app
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          <FormTextField
            control={control}
            name="title"
            label="Title"
            required
          />
          {type === 'route' ? (
            <FormTextField
              control={control}
              name="path"
              label="Path"
              hint="Blank = app index. Or relative path: categories"
              required
            />
          ) : null}
          <FormTextField
            control={control}
            name="iconUrl"
            label="Icon URL"
            hint="HTTPS only. Leave blank for none."
          />
          <Controller
            name="parentId"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id={parentLabelId}>Parent</InputLabel>
                <Select
                  {...field}
                  labelId={parentLabelId}
                  label="Parent"
                  value={field.value ?? ''}
                >
                  <MenuItem value="">Root (no parent)</MenuItem>
                  {parentOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : (
                  <FormHelperText>
                    Nested under this node. Root sits at the top of the tree.
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          <ScopeMultiSelect
            control={control}
            name="scopeNames"
            options={scopeOptions}
            hint="At least one scope (no silent inherit from parent)"
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="nav-item-form"
          variant="contained"
          disabled={busy}
        >
          {mode === 'create' ? 'Add' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
