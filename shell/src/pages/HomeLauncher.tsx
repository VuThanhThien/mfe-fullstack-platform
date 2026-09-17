/**
 * /app index — accessible MfeConfig widgets. Drawer is hidden on this route.
 */
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRemoteContext } from '../context/RemoteContext';
import { AppLauncherGrid } from '../layout/AppLauncherGrid';

export function HomeLauncher() {
  const { accessibles } = useRemoteContext();
  const navigate = useNavigate();

  if (accessibles.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="text.secondary">
          No applications available
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Your account does not have access to any applications.
          <br />
          Contact your administrator to request the required scopes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }} data-testid="home-launcher">
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Applications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select an app to get started.
      </Typography>
      <AppLauncherGrid
        items={accessibles}
        onSelect={(item) => navigate(`/${item.routeName}`)}
      />
    </Box>
  );
}
