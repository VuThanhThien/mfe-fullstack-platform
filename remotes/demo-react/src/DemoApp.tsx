import { useEffect, useState } from 'react';
import type { RemoteMountContext } from '@mfe/sdk';
import { createTheme, getMode, PageToolbar, subscribeMode } from '@mfe/ui';
import { Box, CssBaseline, Link as MuiLink, ThemeProvider } from '@mui/material';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { StatusPage } from './pages/StatusPage';

type DemoAppProps = RemoteMountContext;

export function DemoApp({ basePath }: DemoAppProps) {
  const [mode, setModeState] = useState(getMode);

  useEffect(() => subscribeMode(setModeState), []);

  return (
    <ThemeProvider theme={createTheme(mode)}>
      <CssBaseline />
      <BrowserRouter basename={basePath}>
        <Box>
          <PageToolbar title="Demo">
            <MuiLink component={Link} to="/" underline="hover">
              Home
            </MuiLink>
            <MuiLink component={Link} to="/dashboard" underline="hover">
              Dashboard
            </MuiLink>
            <MuiLink component={Link} to="/status" underline="hover">
              Status
            </MuiLink>
          </PageToolbar>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="*" element={<StatusPage />} />
          </Routes>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}
