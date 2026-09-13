import { Box, Tab, Tabs } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const TABS = [
  { label: 'Users', to: 'users' },
  { label: 'Scopes', to: 'scopes' },
  { label: 'Configs', to: 'configs' },
] as const;

function activeTab(pathname: string): string {
  if (pathname.includes('/scopes')) return 'scopes';
  if (pathname.includes('/configs')) return 'configs';
  return 'users';
}

export function AdminNav() {
  const { pathname } = useLocation();
  const current = activeTab(pathname);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs value={current}>
        {TABS.map((tab) => (
          <Tab
            key={tab.to}
            label={tab.label}
            value={tab.to}
            component={RouterLink}
            to={tab.to}
          />
        ))}
      </Tabs>
    </Box>
  );
}
