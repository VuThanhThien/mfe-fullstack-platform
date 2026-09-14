/**
 * App — root router.
 *
 * BrowserRouter **must** have basename="/app" — this aligns with
 * Vite base="/app/" and Caddy's /app/* → shell:5174 proxy rule.
 * NEVER remove basename; it prevents routing from breaking under the gateway.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mfe/ui';
import { Gate } from './auth/Gate';
import { ShellLayout } from './layout/ShellLayout';
import { RemoteOutlet } from './pages/RemoteOutlet';
import { NotFound } from './pages/NotFound';
import { useThemeMode } from './theme/use-theme-mode';

export default function App() {
  const mode = useThemeMode();

  return (
    <ThemeProvider theme={createTheme(mode)}>
      <CssBaseline />
      <BrowserRouter basename="/app">
        <Gate>
          <Routes>
            <Route element={<ShellLayout />}>
              {/* /app/ → redirect to first accessible or just stay at root (ShellLayout shows empty state) */}
              <Route index element={<Navigate to="." replace />} />
              <Route path=":routeName/*" element={<RemoteOutlet />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Gate>
      </BrowserRouter>
    </ThemeProvider>
  );
}
