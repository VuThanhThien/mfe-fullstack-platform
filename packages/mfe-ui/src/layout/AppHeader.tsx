import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { drawerWidth } from './widths.js';

export type AppHeaderProps = {
  title: string;
  /** Mobile: open overlay drawer. Desktop: often toggles collapse. */
  onMenuClick?: () => void;
  /** Show menu button on sm+ as well (collapse toggle) */
  menuAlwaysVisible?: boolean;
  /** Right-side actions (theme toggle, logout, …) */
  children?: ReactNode;
  /** Offset for permanent drawer on sm+ */
  drawerOffset?: number;
};

export function AppHeader({
  title,
  onMenuClick,
  menuAlwaysVisible = false,
  children,
  drawerOffset = drawerWidth,
}: AppHeaderProps) {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: { sm: `calc(100% - ${drawerOffset}px)` },
        ml: { sm: `${drawerOffset}px` },
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Toolbar>
        {onMenuClick ? (
          <IconButton
            color="inherit"
            aria-label="toggle navigation drawer"
            edge="start"
            onClick={onMenuClick}
            data-testid="nav-drawer-toggle"
            sx={{
              mr: 2,
              display: menuAlwaysVisible
                ? 'inline-flex'
                : { xs: 'inline-flex', sm: 'none' },
            }}
          >
            <MenuIcon />
          </IconButton>
        ) : null}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
