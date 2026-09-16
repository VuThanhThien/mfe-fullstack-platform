import { Box, Toolbar, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type PageToolbarProps = {
  title?: string;
  children?: ReactNode;
};

/** In-remote page chrome only — not a second AppBar/sidebar. */
export function PageToolbar({ title, children }: PageToolbarProps) {
  return (
    <Toolbar
      disableGutters
      sx={{
        mb: 2,
        minHeight: { xs: 48 },
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {title ? (
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
      ) : (
        <Box sx={{ flexGrow: 1 }} />
      )}
      {children}
    </Toolbar>
  );
}
