import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

/**
 * Public landing page.
 * Spec §4.1: "/" never auto-redirects authenticated users.
 */
export default function Home() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 12, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          MFE Platform
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          A production-shaped micro-frontend platform. Same-origin delivery via
          Caddy, scope-gated remote registry, cookie-based session management.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            component={Link}
            to="/login"
            size="large"
          >
            Sign in
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to="/register"
            size="large"
          >
            Register
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
