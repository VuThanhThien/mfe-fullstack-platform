import { zodResolver } from '@hookform/resolvers/zod';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';
import { FormActions } from '../../components/FormActions';
import { FormTextField } from '../../components/FormTextField';
import { ScopeMultiSelect } from '../../components/ScopeMultiSelect';
import { useEntityForm } from '../../hooks/use-entity-form';
import { useFormSubmit } from '../../hooks/use-form-submit';
import { useScopeOptions } from '../../hooks/use-scope-options';
import { getMe, getUser, updateUser } from '../../lib/api/users';
import { ADMIN_SCOPE } from '../../lib/constants';
import type { UserDto } from '../../lib/types';
import { updateUserSchema, type UpdateUserForm } from '../../schemas/user';

const toFormValues = (user: UserDto): UpdateUserForm => ({
  bio: user.bio ?? '',
  image: user.image ?? '',
  scopeNames: (user.scopes ?? []).map((scope) => scope.name),
});

export function UserEditPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { options, error: scopesError } = useScopeOptions();
  const [meId, setMeId] = useState<string | null>(null);
  const [meReady, setMeReady] = useState(false);

  const { control, handleSubmit, reset } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { bio: '', image: '', scopeNames: [] },
  });

  const {
    entity: user,
    loading,
    error: loadError,
  } = useEntityForm({
    id,
    fetchEntity: getUser,
    toValues: toFormValues,
    reset,
  });

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setMeId(me.id);
      })
      .catch(() => {
        /* SoftGate already requires ADMIN; me() failures surface on save. */
      })
      .finally(() => {
        if (!cancelled) setMeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const editingSelf = Boolean(meId && user && meId === user.id);
  const identityPending = !meReady;

  const {
    error: saveError,
    submitting,
    submit,
  } = useFormSubmit<UpdateUserForm>(
    ({ bio, image, scopeNames }) => {
      if (!meReady || !meId) {
        throw new Error('Still loading your identity — try again in a moment.');
      }
      const nextScopes = scopeNames ?? [];
      // Soft guard: do not strip ADMIN from your own account via this UI.
      if (meId === id && !nextScopes.includes(ADMIN_SCOPE)) {
        throw new Error(
          'You cannot remove the ADMIN scope from your own account.',
        );
      }
      return updateUser(id, {
        bio: bio || undefined,
        image: image || undefined,
        ...(nextScopes.length ? { scopeNames: nextScopes } : {}),
      });
    },
    { successMessage: 'User updated' },
  );

  if (loading || identityPending) {
    return <CircularProgress size={24} />;
  }

  return (
    <Box maxWidth={480}>
      <Typography variant="h6" gutterBottom>
        Edit user
      </Typography>
      {user ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {user.username} · {user.email}
        </Typography>
      ) : null}
      <Typography
        variant="caption"
        display="block"
        color="text.secondary"
        mb={2}
      >
        Username, email, and password are not editable via this API.
        {editingSelf
          ? ' You cannot remove ADMIN from your own account here.'
          : ''}
      </Typography>
      <ErrorAlert message={saveError ?? loadError ?? scopesError} />
      <Stack component="form" onSubmit={handleSubmit(submit)} spacing={2}>
        <FormTextField
          control={control}
          name="bio"
          label="Bio"
          multiline
          minRows={2}
        />
        <FormTextField control={control} name="image" label="Image URL" />
        <ScopeMultiSelect
          control={control}
          name="scopeNames"
          options={options}
          hint="Sending scopes replaces the full set. Leave at least one selected to update."
        />
        <FormActions submitLabel="Save" busy={submitting} />
      </Stack>
    </Box>
  );
}
