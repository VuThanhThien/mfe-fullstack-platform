/**
 * Unsupported — rendered when a nav item has framework !== 'react'.
 *
 * Shell Phase C mounts React remotes only (spec §2 decisions, §5.2).
 * Vue / Angular wrappers are planned for a later phase.
 * loadRemote is deliberately NOT called for unsupported frameworks.
 */
import { Box, Chip, Typography } from '@mui/material';

interface UnsupportedProps {
  framework: string;
}

export function Unsupported({ framework }: UnsupportedProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" color="text.secondary">
        Not supported in this build
      </Typography>
      <Chip label={framework} variant="outlined" size="small" />
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        This application requires a <strong>{framework}</strong> runtime wrapper
        that is not yet available in the shell. Support will be added in a future
        phase.
      </Typography>
    </Box>
  );
}
