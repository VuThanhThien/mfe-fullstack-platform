/**
 * ShellLayout — authenticated chrome.
 *
 * Structure:
 *   AppBar     — title + logout button
 *   Nav drawer — list of accessible remotes (title → /app/:routeName)
 *   Main       — <Outlet /> for routed content; empty state when no remotes
 *
 * Spec §4.4, §5.2:
 * - Nav built from accessible MfeAccessibleItem[] (title + routeName)
 * - Logout: logout() → window.location.assign('/login')
 * - Empty accessible → empty state (not an error)
 */
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '@mfe/sdk';
import { useBoolean } from 'usehooks-ts';
import { useRemoteContext } from '../context/RemoteContext';

const DRAWER_WIDTH = 240;

export function ShellLayout() {
  const { accessibles } = useRemoteContext();
  const { routeName } = useParams<{ routeName?: string }>();
  const navigate = useNavigate();
  // usehooks-ts: intent-revealing toggles instead of bespoke useState + setters
  const {
    value: mobileOpen,
    toggle: toggleMobileDrawer,
    setFalse: closeMobileDrawer,
  } = useBoolean(false);
  const { value: isLoggingOut, setTrue: startLogout } = useBoolean(false);

  async function handleLogout() {
    startLogout();
    try {
      await logout();
    } finally {
      // Always redirect — do not trap the user even if logout request fails
      window.location.assign('/login');
    }
  }

  // Navigate to the first accessible remote, or stay at root
  function handleNavItemClick(route: string) {
    navigate(`/${route}`);
    closeMobileDrawer();
  }

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          Navigation
        </Typography>
      </Toolbar>
      <Divider />
      {accessibles.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            No apps available.
            <br />
            Contact your administrator to request access.
          </Typography>
        </Box>
      ) : (
        <List dense>
          {accessibles.map((item) => (
            <ListItem key={item.routeName} disablePadding>
              <ListItemButton
                selected={routeName === item.routeName}
                onClick={() => handleNavItemClick(item.routeName)}
                component={Link}
                to={`/${item.routeName}`}
              >
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* ── AppBar ── */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleMobileDrawer}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            MFE Platform
          </Typography>
          <Button
            color="inherit"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            startIcon={isLoggingOut ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
            aria-label="logout"
          >
            {isLoggingOut ? 'Logging out…' : 'Logout'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Nav drawer — mobile ── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobileDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* ── Nav drawer — desktop (permanent) ── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px', // AppBar height (default MUI toolbar)
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {accessibles.length === 0 ? (
          <EmptyState />
        ) : (
          <Outlet />
        )}
      </Box>
    </Box>
  );
}

function EmptyState() {
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
