import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { FrameworkSelect } from '../../components/FrameworkSelect';
import { ScopeMultiSelect } from '../../components/ScopeMultiSelect';
import { useEntityForm } from '../../hooks/use-entity-form';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { useScopeOptions } from '../../hooks/use-scope-options';
import { getConfig, updateConfig } from '../../lib/api/configs';
import {
  ADMIN_ROUTE_NAME,
  FRAMEWORKS,
  type Framework,
} from '../../lib/constants';
import type { MfeConfigDto } from '../../lib/types';
import {
  updateConfigSchema,
  type UpdateConfigForm,
} from '../../schemas/config';

/** The registry stores `framework` as a free string; fall back so the Select stays in range. */
function toFramework(value: string): Framework {
  return FRAMEWORKS.find((framework) => framework === value) ?? 'react';
}

const toFormValues = (config: MfeConfigDto): UpdateConfigForm => ({
  remoteEntry: config.remoteEntry,
  remoteName: config.remoteName,
  exposedModule: config.exposedModule,
  routeName: config.routeName,
  title: config.title,
  framework: toFramework(config.framework),
  iconUrl: config.iconUrl ?? '',
  scopeNames: (config.scopes ?? []).map((scope) => scope.name),
});

export function ConfigEditPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { options, error: scopesError } = useScopeOptions();

  const { control, handleSubmit, reset } = useForm<UpdateConfigForm>({
    resolver: zodResolver(updateConfigSchema),
    defaultValues: {
      remoteEntry: '',
      remoteName: '',
      exposedModule: '',
      routeName: '',
      title: '',
      framework: 'react',
      iconUrl: '',
      scopeNames: [],
    },
  });

  const {
    entity: config,
    loading,
    error: loadError,
  } = useEntityForm({
    id,
    fetchEntity: getConfig,
    toValues: toFormValues,
    reset,
  });

  // `scopeNames` is either absent or non-empty here: the schema rejects [].
  const {
    error: saveError,
    submitting,
    submit,
  } = useFormSubmit<UpdateConfigForm>((values) => updateConfig(id, values), {
    successMessage: 'Config updated',
  });

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <Box maxWidth={560}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <Typography variant="h6">Edit MfeConfig</Typography>
        <Button component={RouterLink} to="nav" size="small">
          Nav tree
        </Button>
      </Stack>
      {config?.routeName === ADMIN_ROUTE_NAME ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Changing Admin config scopes can remove Admin from your own nav until
          fixed via API or re-seed.
        </Alert>
      ) : null}
      <ErrorAlert message={saveError ?? loadError ?? scopesError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField control={control} name="title" label="Title" required />
        <FormTextField
          control={control}
          name="routeName"
          label="routeName"
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
          required
        />
        <FrameworkSelect control={control} name="framework" />
        <FormTextField
          control={control}
          name="iconUrl"
          label="Icon URL"
          hint="HTTPS URL for the launcher tile. Leave blank to clear."
        />
        <ScopeMultiSelect
          control={control}
          name="scopeNames"
          options={options}
          required
        />
        <FormActions submitLabel="Save" busy={submitting} />
      </Stack>
    </Box>
  );
}
