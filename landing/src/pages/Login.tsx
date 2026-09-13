import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, login, refresh, safeNext } from '@mfe/sdk';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import { loginSchema, type LoginForm } from '../schemas/auth.js';

/**
 * Login page.
 *
 * Boot behaviour (spec §5.1):
 *   If refresh() succeeds → the user already has a session → redirect to safe next.
 *   If refresh() fails (no cookie / expired) → show the form.
 *
 * Submit behaviour:
 *   react-hook-form + zod validate the fields locally, then login(dto) →
 *   location.assign(safeNext(?next param)).
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const [checkingSession, setCheckingSession] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    value: isSubmitting,
    setTrue: startSubmitting,
    setFalse: stopSubmitting,
  } = useBoolean(false);

  const next = searchParams.get('next');

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // On mount: attempt silent re-auth via the HttpOnly cookie.
  useEffect(() => {
    refresh()
      .then(() => {
        // Already authenticated — skip the form.
        window.location.assign(safeNext(next));
      })
      .catch(() => {
        // No valid session — show the login form.
        setCheckingSession(false);
      });
    // Runs once on mount; `next` is stable for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    startSubmitting();
    try {
      await login(values);
      window.location.assign(safeNext(next));
    } catch (err) {
      setFormError(resolveLoginError(err));
      stopSubmitting();
    }
  });

  // While checking the cookie, render nothing (avoids a flash of the login form).
  if (checkingSession) return null;

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 10 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          Sign in
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
                autoComplete="current-password"
                margin="normal"
                disabled={isSubmitting}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        <Typography variant="body2" align="center">
          No account?{' '}
          <MuiLink component={Link} to="/register">
            Register
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}

function resolveLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 422) {
      return 'Invalid email or password.';
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (err.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
