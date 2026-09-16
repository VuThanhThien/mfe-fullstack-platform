import { zodResolver } from '@hookform/resolvers/zod';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { useEntityForm } from '../../hooks/use-entity-form';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { getScope, updateScope } from '../../lib/api/scopes';
import { ADMIN_SCOPE } from '../../lib/constants';
import type { ScopeDto } from '../../lib/types';
import { updateScopeSchema, type UpdateScopeForm } from '../../schemas/scope';

const toFormValues = (scope: ScopeDto): UpdateScopeForm => ({
  name: scope.name,
  description: scope.description ?? '',
});

export function ScopeEditPage() {
  const { id = '' } = useParams<{ id: string }>();

  const { control, handleSubmit, reset } = useForm<UpdateScopeForm>({
    resolver: zodResolver(updateScopeSchema),
    defaultValues: { name: '', description: '' },
  });

  const {
    entity: scope,
    loading,
    error: loadError,
  } = useEntityForm({
    id,
    fetchEntity: getScope,
    toValues: toFormValues,
    reset,
  });

  const isAdminScope = scope?.name === ADMIN_SCOPE;

  const {
    error: saveError,
    submitting,
    submit,
  } = useFormSubmit<UpdateScopeForm>(
    ({ name, description }) =>
      updateScope(id, {
        // Never rename ADMIN from the UI (backend also rejects).
        ...(!isAdminScope && name ? { name } : {}),
        description: description ?? '',
      }),
    { successMessage: 'Scope updated' },
  );

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <Box maxWidth={480}>
      <Typography variant="h6" gutterBottom>
        Edit scope
      </Typography>
      <ErrorAlert message={saveError ?? loadError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField
          control={control}
          name="name"
          label="Name"
          required
          disabled={isAdminScope}
          hint={
            isAdminScope ? 'The ADMIN scope name cannot be renamed' : undefined
          }
        />
        <FormTextField
          control={control}
          name="description"
          label="Description"
        />
        <FormActions submitLabel="Save" busy={submitting} />
      </Stack>
    </Box>
  );
}
