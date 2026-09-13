/**
 * App — root router.
 *
 * BrowserRouter **must** have basename="/app" — this aligns with
 * Vite base="/app/" and Caddy's /app/* → shell:5174 proxy rule.
 * NEVER remove basename; it prevents routing from breaking under the gateway.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { Gate } from './auth/Gate';
import { ShellLayout } from './layout/ShellLayout';
import { RemoteOutlet } from './pages/RemoteOutlet';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <>
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
    </>
  );
}
