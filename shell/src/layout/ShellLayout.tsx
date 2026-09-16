/**
 * ShellLayout — authenticated chrome via @mfe/ui layout kit.
 *
 * Structure:
 *   AppHeader  — title + collapse toggle + theme + logout
 *   NavDrawer  — accessible remotes (collapsible on desktop)
 *   Main       — padded outlet (reference Admin px: { xs: 3, sm: 6 })
 *   AppFooter  — product line
 *   Snackbar   — remote onNotify (one-way)
 */
import type { RemoteNotification } from '@mfe/sdk';
import { logout } from '@mfe/sdk';
import {
  AppFooter,
  AppHeader,
  NavDrawer,
  drawerCollapsedWidth,
  drawerWidth,
  setMode,
} from '@mfe/ui';
import AppsIcon from '@mui/icons-material/Apps';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useBoolean, useLocalStorage } from 'usehooks-ts';
import { NotifyContext } from '../context/NotifyContext';
import { useRemoteContext } from '../context/RemoteContext';
import { useThemeMode } from '../theme/use-theme-mode';

/** Preference only — never tokens. E2E allowlist must include this key. */
const DRAWER_COLLAPSED_KEY = 'mfe-ui-drawer-collapsed';

export function ShellLayout() {
  const { accessibles } = useRemoteContext();
  const { routeName } = useParams<{ routeName?: string }>();
  const mode = useThemeMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const {
    value: mobileOpen,
    toggle: toggleMobileDrawer,
    setFalse: closeMobileDrawer,
  } = useBoolean(false);
  const [collapsed, setCollapsed] = useLocalStorage(
    DRAWER_COLLAPSED_KEY,
    false,
  );
  const { value: isLoggingOut, setTrue: startLogout } = useBoolean(false);

  const navWidth = collapsed ? drawerCollapsedWidth : drawerWidth;

  function handleToggleMode() {
    setMode(mode === 'light' ? 'dark' : 'light');
  }

  function handleMenuClick() {
    if (isDesktop) {
      setCollapsed(!collapsed);
      return;
    }
    toggleMobileDrawer();
  }

  const [snack, setSnack] = useState<RemoteNotification & { open: boolean }>({
    open: false,
    level: 'info',
    message: '',
  });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const onNotify = useCallback((n: RemoteNotification) => {
    setSnack({ open: true, level: n.level, message: n.message });
  }, []);

  async function handleLogout() {
    startLogout();
    try {
      await logout();
    } finally {
      window.location.assign('/login');
    }
  }

  const navList =
    accessibles.length === 0 ? (
      <Box sx={{ p: 2 }}>
        {!collapsed && (
          <Typography variant="body2" color="text.secondary" align="center">
            No apps available.
            <br />
            Contact your administrator to request access.
          </Typography>
        )}
      </Box>
    ) : (
      <List component="nav" dense sx={{ px: collapsed ? 1 : 2 }}>
        {accessibles.map((item) => {
          const selected = routeName === item.routeName;
          const initial = (item.title?.trim()?.[0] ?? '?').toUpperCase();
          const button = (
            <ListItemButton
              selected={selected}
              onClick={closeMobileDrawer}
              component={Link}
              to={`/${item.routeName}`}
              sx={{
                borderRadius: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
              }}
            >
              <ListItemAvatar sx={{ minWidth: collapsed ? 0 : 56 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: selected ? 'primary.main' : 'action.hover',
                    color: selected ? 'primary.contrastText' : 'text.primary',
                    fontSize: 14,
                  }}
                >
                  {initial || <AppsIcon fontSize="small" />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{ noWrap: true }}
                sx={{ display: collapsed ? 'none' : 'block' }}
              />
            </ListItemButton>
          );
          return (
            <ListItem key={item.routeName} disablePadding sx={{ mb: 0.5 }}>
              {collapsed ? (
                <Tooltip title={item.title} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>
    );

  const drawerHeader = (
    <>
      <Toolbar
        sx={{
          px: collapsed ? 1 : 2,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        {!collapsed && (
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            Navigation
          </Typography>
        )}
      </Toolbar>
      <Divider />
    </>
  );

  return (
    <NotifyContext.Provider value={onNotify}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppHeader
          title="MFE Platform"
          onMenuClick={handleMenuClick}
          menuAlwaysVisible
          drawerOffset={navWidth}
        >
          <IconButton
            color="inherit"
            onClick={handleToggleMode}
            data-testid="theme-mode-toggle"
            aria-label={
              mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
          >
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
          <Button
            color="inherit"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            startIcon={
              isLoggingOut ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <LogoutIcon />
              )
            }
            aria-label="logout"
          >
            {isLoggingOut ? 'Logging out…' : 'Logout'}
          </Button>
        </AppHeader>

        <NavDrawer
          variant="temporary"
          width={drawerWidth}
          open={mobileOpen}
          onClose={closeMobileDrawer}
          header={drawerHeader}
        >
          {navList}
        </NavDrawer>
        <NavDrawer variant="permanent" width={navWidth} header={drawerHeader}>
          {navList}
        </NavDrawer>

        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: { sm: `calc(100% - ${navWidth}px)` },
            minHeight: '100vh',
            // Match reference Admin layout horizontal padding
            px: { xs: 3, sm: 6 },
            pb: 3,
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }}
        >
          <Toolbar />
          <Box sx={{ flexGrow: 1 }}>
            {accessibles.length === 0 ? <EmptyState /> : <Outlet />}
          </Box>
          <AppFooter text="MFE Platform · authenticated shell" />
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={closeSnack}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={snack.level}
            variant="filled"
            onClose={closeSnack}
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </NotifyContext.Provider>
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
