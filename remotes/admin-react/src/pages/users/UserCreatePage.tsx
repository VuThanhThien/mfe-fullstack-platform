import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { ScopeMultiSelect } from '../../components/ScopeMultiSelect';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { useScopeOptions } from '../../hooks/use-scope-options';
import { createUser } from '../../lib/api/users';
import { createUserSchema, type CreateUserForm } from '../../schemas/user';

export function UserCreatePage() {
  const { options, error: scopesError } = useScopeOptions();

  const { control, handleSubmit } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      bio: '',
      scopeNames: [],
    },
  });

  const {
    error: formError,
    submitting,
    submit,
  } = useFormSubmit<CreateUserForm>(
    ({ username, email, password, bio, scopeNames }) =>
      // The API rejects blank strings and an empty scope array — omit instead.
      createUser({
        username,
        email,
        password,
        ...(bio ? { bio } : {}),
        ...(scopeNames?.length ? { scopeNames } : {}),
      }),
    { successMessage: 'User created' },
  );

  return (
    <Box maxWidth={480}>
      <Typography variant="h6" gutterBottom>
        Create user
      </Typography>
      <ErrorAlert message={formError ?? scopesError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField
          control={control}
          name="username"
          label="Username"
          required
        />
        <FormTextField
          control={control}
          name="email"
          label="Email"
          type="email"
          required
        />
        <FormTextField
          control={control}
          name="password"
          label="Password"
          type="password"
          required
        />
        <FormTextField
          control={control}
          name="bio"
          label="Bio"
          multiline
          minRows={2}
        />
        <ScopeMultiSelect
          control={control}
          name="scopeNames"
          options={options}
          hint="Optional. Empty array is rejected by the API — omit by leaving empty."
        />
        <FormActions submitLabel="Create" busy={submitting} />
      </Stack>
    </Box>
  );
}
