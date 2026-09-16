import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type AppFooterProps = {
  text?: string;
  children?: ReactNode;
};

export function AppFooter({ text, children }: AppFooterProps) {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {children ?? (
        <Typography variant="body2" color="text.secondary">
          {text ?? ''}
        </Typography>
      )}
    </Box>
  );
}
