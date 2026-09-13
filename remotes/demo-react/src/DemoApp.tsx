import { useEffect, useState } from 'react';
import { ApiError, api } from '@mfe/sdk';
import { useBoolean } from 'usehooks-ts';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Paper,
  Stack,
  Chip,
} from '@mui/material';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/** Turn an SDK failure into a message that is useful in the demo panel. */
function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Cannot reach the server.';
    return `${err.status} ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

export function DemoApp() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { value: loading, setFalse: stopLoading } = useBoolean(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        // axios: payload lives on `data`; non-2xx rejects with ApiError.
        const { data } = await api.get<UserProfile>('/api/v1/users/me');
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(describeApiError(err));
        }
      } finally {
        if (!cancelled) {
          stopLoading();
        }
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Demo React Remote
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={2}>
        This module is loaded via Module Federation from{' '}
        <code>/r/demo-react/remoteEntry.js</code>. It proves the{' '}
        <code>@mfe/sdk</code> singleton works across the shell + remote boundary.
      </Typography>

      {loading && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading profile…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <strong>GET /api/v1/users/me failed:</strong> {error}
        </Alert>
      )}

      {profile && (
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Authenticated user
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {profile.firstName || profile.lastName
                ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
                : profile.email}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={profile.email} size="small" variant="outlined" />
              <Chip
                label={`id: ${profile.id.slice(0, 8)}…`}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
