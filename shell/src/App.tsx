/**
 * App — root router.
 *
 * BrowserRouter **must** have basename="/app" — this aligns with
 * Vite base="/app/" and Caddy's /app/* → shell:5174 proxy rule.
 * NEVER remove basename; it prevents routing from breaking under the gateway.
 */
import { createTheme } from '@mfe/ui';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Gate } from './auth/Gate';
import { NavProvider } from './context/NavContext';
import { ShellLayout } from './layout/ShellLayout';
import { HomeLauncher } from './pages/HomeLauncher';
import { NotFound } from './pages/NotFound';
import { RemoteOutlet } from './pages/RemoteOutlet';
import { ShellHistorySync } from './routing/ShellHistorySync';
import { useThemeMode } from './theme/use-theme-mode';

export default function App() {
  const mode = useThemeMode();

  return (
    <ThemeProvider theme={createTheme(mode)}>
      <CssBaseline />
      <BrowserRouter basename="/app">
        <ShellHistorySync />
        <Gate>
          <NavProvider>
            <Routes>
              <Route element={<ShellLayout />}>
                <Route index element={<HomeLauncher />} />
                <Route path=":routeName/*" element={<RemoteOutlet />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </NavProvider>
        </Gate>
      </BrowserRouter>
    </ThemeProvider>
  );
}
