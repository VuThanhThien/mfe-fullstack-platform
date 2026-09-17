/**
 * ShellLayout — authenticated chrome via @mfe/ui layout kit.
 *
 * Structure:
 *   AppHeader  — title + collapse toggle + Apps + theme + logout
 *   NavDrawer  — per-app nested nav (hidden on /app index)
 *   Main       — padded outlet
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useBoolean, useLocalStorage } from 'usehooks-ts';
import { NotifyContext } from '../context/NotifyContext';
import { useRemoteContext } from '../context/RemoteContext';
import { useThemeMode } from '../theme/use-theme-mode';
import { AppsPopover } from './AppsPopover';
import { NavTree } from './NavTree';

/** Preference only — never tokens. E2E allowlist must include this key. */
const DRAWER_COLLAPSED_KEY = 'mfe-ui-drawer-collapsed';

export function ShellLayout() {
  const { accessibles } = useRemoteContext();
  const { routeName } = useParams<{ routeName?: string }>();
  const inApp = Boolean(routeName);
  const currentApp = accessibles.find((item) => item.routeName === routeName);
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

  const navWidth = inApp ? (collapsed ? drawerCollapsedWidth : drawerWidth) : 0;

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
            {currentApp?.title ?? 'Navigation'}
          </Typography>
        )}
      </Toolbar>
      <Divider />
    </>
  );

  const navTree = (
    <NavTree collapsed={collapsed} onLeafClick={closeMobileDrawer} />
  );

  return (
    <NotifyContext.Provider value={onNotify}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppHeader
          title={currentApp?.title ?? 'MFE Platform'}
          onMenuClick={inApp ? handleMenuClick : undefined}
          menuAlwaysVisible={inApp}
          drawerOffset={navWidth}
        >
          <AppsPopover items={accessibles} selectedRouteName={routeName} />
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

        {inApp ? (
          <>
            <NavDrawer
              variant="temporary"
              width={drawerWidth}
              open={mobileOpen}
              onClose={closeMobileDrawer}
              header={drawerHeader}
            >
              <NavTree collapsed={false} onLeafClick={closeMobileDrawer} />
            </NavDrawer>
            <NavDrawer
              variant="permanent"
              width={navWidth}
              header={drawerHeader}
            >
              {navTree}
            </NavDrawer>
          </>
        ) : null}

        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: { sm: `calc(100% - ${navWidth}px)` },
            minHeight: '100vh',
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
            <Outlet />
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
