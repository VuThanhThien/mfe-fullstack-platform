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
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
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
  const [totalPages, setTotalPages] = useState(1);
  const {
    value: loading,
    setTrue: startLoading,
    setFalse: stopLoading,
  } = useBoolean(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const raw = Number(searchParams.get('page') ?? '1');
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;

  const goTo = (n: number) => setSearchParams(n > 1 ? { page: String(n) } : {});

  const load = async (pageNum: number) => {
    startLoading();
    setError(null);
    try {
      const result = await listConfigs(pageNum);
      setConfigs(result.data);
      const tp = result.pagination.totalPages || 1;
      setTotalPages(tp);
      // clamp stale URL param
      if (pageNum > tp) goTo(tp);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const deletion = useDeleteFlow<MfeConfigDto>({
    remove: (config) => deleteConfig(config.id),
    onDeleted: () => load(page),
    onError: setError,
    successMessage: 'Config deleted',
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
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                  >
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
                    component={RouterLink}
                    to={`${config.id}/nav`}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Nav
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

      <Stack direction="row" spacing={1} mt={2} alignItems="center">
        <Button
          size="small"
          disabled={page <= 1 || loading}
          onClick={() => goTo(page - 1)}
        >
          Prev
        </Button>
        <Typography variant="body2">
          Page {page} / {totalPages}
        </Typography>
        <Button
          size="small"
          disabled={page >= totalPages || loading}
          onClick={() => goTo(page + 1)}
        >
          Next
        </Button>
      </Stack>

      <ConfirmDialog
        open={Boolean(deletion.target)}
        title="Delete MfeConfig?"
        description={deletion.target ? describeDeletion(deletion.target) : ''}
        confirmColor={isSeeded ? 'warning' : 'error'}
        busy={deletion.busy}
        onCancel={deletion.cancel}
        onConfirm={() => void deletion.confirm()}
      />
    </Box>
  );
}
