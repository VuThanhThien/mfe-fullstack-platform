import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, register } from '@mfe/sdk';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import {
  PASSWORD_MIN_LENGTH,
  registerSchema,
  type RegisterForm,
} from '../schemas/auth.js';

/**
 * Register page.
 *
 * Spec §5.1:
 *   register(dto) → { userId } only — no cookie, no auto-session.
 *   On success → navigate /login (no redirect back).
 *   E003 ("email already exists") → user-friendly message.
 */
export default function Register() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    value: isSubmitting,
    setTrue: startSubmitting,
    setFalse: stopSubmitting,
  } = useBoolean(false);

  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    startSubmitting();
    try {
      await register(values);
      // No auto-session — send the user to login so they authenticate explicitly.
      navigate('/login');
    } catch (err) {
      setFormError(resolveRegisterError(err));
      stopSubmitting();
    }
  });

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 10 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          Create account
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Email"
                type="email"
                required
                fullWidth
                autoComplete="email"
                margin="normal"
                disabled={isSubmitting}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                required
                fullWidth
                autoComplete="new-password"
                margin="normal"
                disabled={isSubmitting}
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  `Minimum ${PASSWORD_MIN_LENGTH} characters`
                }
              />
            )}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ mt: 2, mb: 2 }}
          >
            {isSubmitting ? 'Creating account…' : 'Register'}
          </Button>
        </Box>

        <Typography variant="body2" align="center">
          Already have an account?{' '}
          <MuiLink component={Link} to="/login">
            Sign in
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}

function resolveRegisterError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { errorCode?: string } | undefined;
    // E003 = "email already exists" (backend ErrorCode). The register endpoint
    // answers 400 + errorCode, so match on the code rather than a 409.
    if (body?.errorCode === 'E003' || err.status === 409) {
      return 'An account with this email already exists. Please sign in.';
    }
    if (err.status === 422) {
      return 'Please check your email and password.';
    }
    if (err.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
