import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ApiError,
  login,
  refresh,
  safeStandalonePath,
  setRedirect,
  setRedirectPolicy,
} from '@mfe/sdk';
import { LoginForm, SessionGate } from '@mfe/ui/auth';
import { createTheme, getMode, subscribeMode } from '@mfe/ui';
import {
  Alert,
  Box,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
} from '@mui/material';
import { ProductApp } from './ProductApp';

/**
 * Standalone entry — Product tree only (Spec B). Article is shell-nav only.
 */
setRedirectPolicy('standalone');

setRedirect((url) => {
  const next = new URL(url, window.location.origin).searchParams.get('next');
  // Reload the sanitized path in place so SessionGate can re-bootstrap;
  // do not map onto `/?next=` (nothing consumes that query on this SPA).
  window.location.assign(safeStandalonePath(next, '/'));
});

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

function StandaloneRoot() {
  const [mode, setModeState] = useState(getMode);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => subscribeMode(setModeState), []);

  return (
    <ThemeProvider theme={createTheme(mode)}>
      <CssBaseline />
      <SessionGate
        bootstrap={() => refresh().then(() => undefined)}
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
                  Cannot reach the API. Start the backend (and check the Vite
                  `/api` proxy).
                </Alert>
              ) : null}
              <LoginForm
                error={formError}
                onSubmit={async (values) => {
                  setFormError(null);
                  try {
                    await login(values);
                    retry();
                  } catch (err) {
                    setFormError(resolveLoginError(err));
                  }
                }}
              />
            </Box>
          </Container>
        )}
      >
        <ProductApp basePath="/" routeName="product" />
      </SessionGate>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneRoot />
  </StrictMode>,
);
