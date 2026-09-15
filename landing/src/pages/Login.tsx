import { ApiError, login, refresh, safeNext } from '@mfe/sdk';
import { LoginForm, SessionGate } from '@mfe/ui';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

/**
 * Login page — shared `@mfe/ui` LoginForm + SessionGate.
 *
 * Boot: refresh() succeeds → safeNext(?next); fails → LoginForm.
 * Submit: login(dto) → location.assign(safeNext(?next)).
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const next = searchParams.get('next');

  return (
    <SessionGate
      bootstrap={() =>
        refresh().then(() => {
          window.location.assign(safeNext(next));
        })
      }
      renderLogin={({ unreachable, retry }) => (
        <Container maxWidth="xs">
          <Box sx={{ mt: 10 }}>
            {unreachable ? (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={retry}>
                    Retry
                  </Button>
                }
              >
                Cannot reach the API. Is the backend running?
              </Alert>
            ) : null}
            <LoginForm
              error={formError}
              onSubmit={async (values) => {
                setFormError(null);
                try {
                  await login(values);
                  window.location.assign(safeNext(next));
                } catch (err) {
                  setFormError(resolveLoginError(err));
                }
              }}
              footer={
                <Typography variant="body2" align="center">
                  No account?{' '}
                  <MuiLink component={Link} to="/register">
                    Register
                  </MuiLink>
                </Typography>
              }
            />
          </Box>
        </Container>
      )}
    >
      {/* Unreachable: successful bootstrap navigates away before children paint. */}
      {null}
    </SessionGate>
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
