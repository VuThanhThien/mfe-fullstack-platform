/**
 * NotFound — rendered when the :routeName in the URL is not in the
 * accessible list. Does NOT call loadRemote (spec §5.2).
 */
import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

interface NotFoundProps {
  /** The routeName that was not found (may be undefined for wildcard routes). */
  routeName?: string;
}

export function NotFound({ routeName }: NotFoundProps) {
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
      <Typography variant="h4" color="text.secondary">
        404
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Page not found
      </Typography>
      {routeName && (
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ fontFamily: 'monospace' }}
        >
          /app/{routeName}
        </Typography>
      )}
      <Button component={Link} to="/" variant="outlined" size="small">
        Back to shell
      </Button>
    </Box>
  );
}
