import { Alert, Box, Typography } from '@mui/material';

export function Forbidden() {
  return (
    <Box sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Forbidden
      </Typography>
      <Alert severity="warning">
        You need the <strong>ADMIN</strong> scope to use this remote. Nest
        authorization still enforces this on every API call.
      </Alert>
    </Box>
  );
}
