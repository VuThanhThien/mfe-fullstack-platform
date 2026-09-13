import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ListHeader } from '../../components/ListHeader';
import { useDeleteFlow } from '../../hooks/use-delete-flow';
import { deleteConfig, listConfigs } from '../../lib/api/configs';
import { SEEDED_ROUTE_NAMES } from '../../lib/constants';
import { describeApiError } from '../../lib/errors';
import type { MfeConfigDto } from '../../lib/types';

function describeDeletion(config: MfeConfigDto): string {
  if (SEEDED_ROUTE_NAMES.has(config.routeName)) {
    return `WARNING: "${config.routeName}" is a seeded platform remote. Deleting it removes it from the registry and may blank the shell nav until re-seeded. Continue?`;
  }
  return `Delete MfeConfig "${config.title}" (${config.routeName})?`;
}

export function ConfigsListPage() {
  const [configs, setConfigs] = useState<MfeConfigDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { value: loading, setTrue: startLoading, setFalse: stopLoading } =
    useBoolean(true);

  const load = async () => {
    startLoading();
    setError(null);
    try {
      const result = await listConfigs();
      setConfigs(result.data);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deletion = useDeleteFlow<MfeConfigDto>({
    remove: (config) => deleteConfig(config.id),
    onDeleted: load,
    onError: setError,
  });

  const isSeeded = deletion.target
    ? SEEDED_ROUTE_NAMES.has(deletion.target.routeName)
    : false;

  return (
    <Box>
      <ListHeader title="MFE configs" createLabel="Create config" />

      <ErrorAlert message={error} />

      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>routeName</TableCell>
              <TableCell>Framework</TableCell>
              <TableCell>Scopes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>{config.title}</TableCell>
                <TableCell>
                  <code>{config.routeName}</code>
                </TableCell>
                <TableCell>{config.framework}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(config.scopes ?? []).map((scope) => (
                      <Chip key={scope.id} label={scope.name} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    to={config.id}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => deletion.ask(config)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(deletion.target)}
        title="Delete MfeConfig?"
        description={
          deletion.target ? describeDeletion(deletion.target) : ''
        }
        confirmColor={isSeeded ? 'warning' : 'error'}
        busy={deletion.busy}
        onCancel={deletion.cancel}
        onConfirm={() => void deletion.confirm()}
      />
    </Box>
  );
}
