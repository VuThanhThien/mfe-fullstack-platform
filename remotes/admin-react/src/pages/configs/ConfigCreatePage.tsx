import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { FrameworkSelect } from '../../components/FrameworkSelect';
import { ScopeMultiSelect } from '../../components/ScopeMultiSelect';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { useScopeOptions } from '../../hooks/use-scope-options';
import { createConfig } from '../../lib/api/configs';
import {
  createConfigSchema,
  type CreateConfigForm,
} from '../../schemas/config';

export function ConfigCreatePage() {
  const { options, error: scopesError } = useScopeOptions();

  const { control, handleSubmit } = useForm<CreateConfigForm>({
    resolver: zodResolver(createConfigSchema),
    defaultValues: {
      remoteEntry: 'http://localhost:8080/r/',
      remoteName: '',
      exposedModule: './App',
      routeName: '',
      title: '',
      framework: 'react',
      scopeNames: [],
    },
  });

  const {
    error: formError,
    submitting,
    submit,
  } = useFormSubmit<CreateConfigForm>(createConfig, {
    successMessage: 'Config created',
  });

  return (
    <Box maxWidth={560}>
      <Typography variant="h6" gutterBottom>
        Create MfeConfig
      </Typography>
      <ErrorAlert message={formError ?? scopesError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField control={control} name="title" label="Title" required />
        <FormTextField
          control={control}
          name="routeName"
          label="routeName"
          hint="Shell slug: lowercase alphanumeric + hyphens (2–40)"
          required
        />
        <FormTextField
          control={control}
          name="remoteName"
          label="remoteName"
          required
        />
        <FormTextField
          control={control}
          name="exposedModule"
          label="exposedModule"
          required
        />
        <FormTextField
          control={control}
          name="remoteEntry"
          label="remoteEntry"
          hint="Prefer …/mf-manifest.json for Vite ESM remotes"
          required
        />
        <FrameworkSelect control={control} name="framework" />
        <ScopeMultiSelect
          control={control}
          name="scopeNames"
          options={options}
          hint="At least one scope required (ArrayNotEmpty on create)"
          required
        />
        <FormActions submitLabel="Create" busy={submitting} />
      </Stack>
    </Box>
  );
}
