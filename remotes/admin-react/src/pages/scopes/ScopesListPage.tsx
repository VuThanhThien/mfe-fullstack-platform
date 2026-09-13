import {
  Box,
  Button,
  CircularProgress,
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
import { deleteScope, listScopes } from '../../lib/api/scopes';
import { ADMIN_SCOPE } from '../../lib/constants';
import { describeApiError } from '../../lib/errors';
import type { ScopeDto } from '../../lib/types';

export function ScopesListPage() {
  const [scopes, setScopes] = useState<ScopeDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { value: loading, setTrue: startLoading, setFalse: stopLoading } =
    useBoolean(true);

  const load = async () => {
    startLoading();
    setError(null);
    try {
      const result = await listScopes();
      setScopes(result.data);
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

  const deletion = useDeleteFlow<ScopeDto>({
    remove: (scope) => deleteScope(scope.id),
    onDeleted: load,
    onError: setError,
  });

  return (
    <Box>
      <ListHeader title="Scopes" createLabel="Create scope" />

      <ErrorAlert message={error} />

      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scopes.map((scope) => {
              const isAdmin = scope.name === ADMIN_SCOPE;
              return (
                <TableRow key={scope.id}>
                  <TableCell>{scope.name}</TableCell>
                  <TableCell>{scope.description ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={scope.id}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={isAdmin}
                      title={
                        isAdmin
                          ? 'Cannot delete the ADMIN scope'
                          : 'Delete scope'
                      }
                      onClick={() => deletion.ask(scope)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(deletion.target)}
        title="Delete scope?"
        description={
          deletion.target
            ? `Delete scope ${deletion.target.name}? Users and configs referencing it may break.`
            : ''
        }
        busy={deletion.busy}
        onCancel={deletion.cancel}
        onConfirm={() => void deletion.confirm()}
      />
    </Box>
  );
}
