import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { createScope } from '../../lib/api/scopes';
import { createScopeSchema, type CreateScopeForm } from '../../schemas/scope';

export function ScopeCreatePage() {
  const { control, handleSubmit } = useForm<CreateScopeForm>({
    resolver: zodResolver(createScopeSchema),
    defaultValues: { name: '', description: '' },
  });

  const { error: formError, submitting, submit } = useFormSubmit<CreateScopeForm>(
    ({ name, description }) =>
      createScope({ name, ...(description ? { description } : {}) }),
  );

  return (
    <Box maxWidth={480}>
      <Typography variant="h6" gutterBottom>
        Create scope
      </Typography>
      <ErrorAlert message={formError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField
          control={control}
          name="name"
          label="Name"
          hint="Uppercased on submit; A-Z 0-9 _ : . - (2–50)"
          required
        />
        <FormTextField
          control={control}
          name="description"
          label="Description"
        />
        <FormActions submitLabel="Create" busy={submitting} />
      </Stack>
    </Box>
  );
}
