import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from './loginSchema.js';

export type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  /** App-resolved form error (invalid credentials, unreachable, etc.). */
  error?: string | null;
  /** Optional footer (e.g. register link). */
  footer?: ReactNode;
  /** Extra disable while parent is busy. */
  disabled?: boolean;
  title?: string;
};

/**
 * Presentational login form. Apps wire `onSubmit` to `@mfe/sdk` `login()`.
 * No axios, no Nest URLs, no token storage.
 */
export function LoginForm({
  onSubmit,
  error,
  footer,
  disabled = false,
  title = 'Sign in',
}: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const busy = disabled || isSubmitting;

  const submit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  });

  const emailReg = register('email');
  const passwordReg = register('password');

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
        {title}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={submit} noValidate>
        <TextField
          name={emailReg.name}
          onBlur={emailReg.onBlur}
          onChange={emailReg.onChange}
          inputRef={emailReg.ref}
          label="Email"
          type="email"
          required
          fullWidth
          autoComplete="email"
          margin="normal"
          disabled={busy}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <TextField
          name={passwordReg.name}
          onBlur={passwordReg.onBlur}
          onChange={passwordReg.onChange}
          inputRef={passwordReg.ref}
          label="Password"
          type="password"
          required
          fullWidth
          autoComplete="current-password"
          margin="normal"
          disabled={busy}
          error={!!errors.password}
          helperText={errors.password?.message}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={busy}
          sx={{ mt: 2, mb: 2 }}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>

      {footer}
    </Box>
  );
}
