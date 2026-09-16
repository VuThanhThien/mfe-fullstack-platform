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
import { deleteUser, getMe, listUsers } from '../../lib/api/users';
import { describeApiError } from '../../lib/errors';
import type { UserDto } from '../../lib/types';

export function UsersListPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
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
      const [me, result] = await Promise.all([getMe(), listUsers(pageNum)]);
      setMeId(me.id);
      setUsers(result.data);
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

  const deletion = useDeleteFlow<UserDto>({
    remove: (user) => deleteUser(user.id),
    onDeleted: () => load(page),
    onError: setError,
    successMessage: 'User deleted',
  });

  return (
    <Box>
      <ListHeader title="Users" createLabel="Create user" />

      <ErrorAlert message={error} />

      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Scopes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === meId;
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {(user.scopes ?? []).map((scope) => (
                        <Chip key={scope.id} label={scope.name} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={user.id}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={isSelf}
                      title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                      onClick={() => deletion.ask(user)}
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
        title="Delete user?"
        description={
          deletion.target
            ? `Permanently delete ${deletion.target.email}? This cannot be undone.`
            : ''
        }
        busy={deletion.busy}
        onCancel={deletion.cancel}
        onConfirm={() => void deletion.confirm()}
      />
    </Box>
  );
}
