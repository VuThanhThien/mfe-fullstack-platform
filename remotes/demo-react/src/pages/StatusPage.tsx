import { Box, Paper, Typography } from '@mui/material';

/** Static themed status / under-construction page — no API calls. */
export function StatusPage() {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: 'background.paper',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Status
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This demo surface is under construction. Theme tokens come from{' '}
        <code>@mfe/ui</code>; mode follows the shell toggle via{' '}
        <code>subscribeMode</code>.
      </Typography>
      <Box
        sx={{
          mt: 1,
          py: 2,
          px: 2,
          borderRadius: 1,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No charts or live metrics here — keep this remote slim. Check back
          later for platform health widgets.
        </Typography>
      </Box>
    </Paper>
  );
}
