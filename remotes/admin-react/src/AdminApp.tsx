import { Box, CssBaseline, ThemeProvider, Typography, createTheme } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminNav } from './components/AdminNav';
import { SoftGate } from './components/SoftGate';
import { ConfigCreatePage } from './pages/configs/ConfigCreatePage';
import { ConfigEditPage } from './pages/configs/ConfigEditPage';
import { ConfigsListPage } from './pages/configs/ConfigsListPage';
import { ScopeCreatePage } from './pages/scopes/ScopeCreatePage';
import { ScopeEditPage } from './pages/scopes/ScopeEditPage';
import { ScopesListPage } from './pages/scopes/ScopesListPage';
import { UserCreatePage } from './pages/users/UserCreatePage';
import { UserEditPage } from './pages/users/UserEditPage';
import { UsersListPage } from './pages/users/UsersListPage';

const theme = createTheme();

interface AdminAppProps {
  basePath: string;
  routeName: string;
}

export function AdminApp({ basePath, routeName }: AdminAppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SoftGate>
        <BrowserRouter basename={basePath}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Remote <code>{routeName}</code> · manage users, scopes, and MFE
              registry
            </Typography>
            <AdminNav />
            <Routes>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersListPage />} />
              <Route path="users/new" element={<UserCreatePage />} />
              <Route path="users/:id" element={<UserEditPage />} />
              <Route path="scopes" element={<ScopesListPage />} />
              <Route path="scopes/new" element={<ScopeCreatePage />} />
              <Route path="scopes/:id" element={<ScopeEditPage />} />
              <Route path="configs" element={<ConfigsListPage />} />
              <Route path="configs/new" element={<ConfigCreatePage />} />
              <Route path="configs/:id" element={<ConfigEditPage />} />
              <Route path="*" element={<Navigate to="users" replace />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </SoftGate>
    </ThemeProvider>
  );
}
