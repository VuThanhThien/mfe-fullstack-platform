import { Box, Drawer, Toolbar } from '@mui/material';
import type { ReactNode } from 'react';
import { drawerWidth } from './widths.js';

export type NavDrawerProps = {
  /** Permanent (desktop) vs temporary (mobile overlay) */
  variant: 'permanent' | 'temporary';
  width?: number;
  /** temporary only */
  open?: boolean;
  onClose?: () => void;
  header?: ReactNode;
  children: ReactNode;
};

/**
 * Permanent drawer reserves horizontal space via a flex nav wrapper (reference AdminDrawer).
 * Temporary is overlay-only (no spacer).
 */
export function NavDrawer({
  variant,
  width = drawerWidth,
  open = false,
  onClose,
  header,
  children,
}: NavDrawerProps) {
  const body = (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {header ?? <Toolbar />}
      {children}
    </Box>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width,
          },
        }}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: { sm: width },
        flexShrink: { sm: 0 },
        display: { xs: 'none', sm: 'block' },
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width,
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        {body}
      </Drawer>
    </Box>
  );
}
