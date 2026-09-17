import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useBoolean } from 'usehooks-ts';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { NavItemDialog } from '../../components/nav/NavItemDialog';
import { NavTreeEditor } from '../../components/nav/NavTreeEditor';
import { useNotify } from '../../context/notify-context';
import { useDeleteFlow } from '../../hooks/use-delete-flow';
import { useScopeOptions } from '../../hooks/use-scope-options';
import { getConfig } from '../../lib/api/configs';
import {
  createNavItem,
  deleteNavItem,
  listNavItems,
  reorderNavItems,
  updateNavItem,
} from '../../lib/api/nav-items';
import { describeApiError } from '../../lib/errors';
import {
  canAddChild,
  collectBlockedParentIds,
  flattenNavTree,
  moveSibling,
} from '../../lib/nav-tree';
import type { MfeConfigDto, MfeNavItemDto } from '../../lib/types';
import {
  emptyNavItemForm,
  toCreateNavItemBody,
  toUpdateNavItemBody,
  type NavItemForm,
} from '../../schemas/nav-item';

type DialogState =
  | { mode: 'create'; parentId: string; sortOrder: number }
  | { mode: 'edit'; item: MfeNavItemDto };

function itemToForm(item: MfeNavItemDto): NavItemForm {
  return {
    type: item.type,
    title: item.title,
    path: item.path ?? '',
    iconUrl: item.iconUrl ?? '',
    parentId: item.parentId ?? '',
    scopeNames: item.scopeNames,
  };
}

export function ConfigNavPage() {
  const { id = '' } = useParams<{ id: string }>();
  const onNotify = useNotify();
  const { options, error: scopesError } = useScopeOptions();

  const [config, setConfig] = useState<MfeConfigDto | null>(null);
  const [tree, setTree] = useState<MfeNavItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const {
    value: loading,
    setTrue: startLoading,
    setFalse: stopLoading,
  } = useBoolean(true);
  const {
    value: mutating,
    setTrue: startMutating,
    setFalse: stopMutating,
  } = useBoolean(false);
  const {
    value: saving,
    setTrue: startSaving,
    setFalse: stopSaving,
  } = useBoolean(false);

  const load = async () => {
    if (!id) return;
    startLoading();
    setError(null);
    try {
      const [nextConfig, items] = await Promise.all([
        getConfig(id),
        listNavItems(id),
      ]);
      setConfig(nextConfig);
      setTree(items);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const deletion = useDeleteFlow<MfeNavItemDto>({
    remove: (item) => deleteNavItem(id, item.id),
    onDeleted: () => load(),
    onError: setError,
    successMessage: 'Nav item deleted',
  });

  const parentOptions = useMemo(() => {
    const blocked =
      dialog?.mode === 'edit'
        ? collectBlockedParentIds(dialog.item)
        : new Set<string>();
    return flattenNavTree(tree)
      .filter(
        (row) =>
          row.item.type === 'group' &&
          !blocked.has(row.item.id) &&
          canAddChild(row.depth, row.item.type),
      )
      .map((row) => ({
        id: row.item.id,
        label: `${'— '.repeat(row.depth - 1)}${row.item.title}`,
      }));
  }, [tree, dialog]);

  const initialValues = useMemo((): NavItemForm => {
    if (!dialog) return emptyNavItemForm();
    if (dialog.mode === 'edit') return itemToForm(dialog.item);
    return { ...emptyNavItemForm(), parentId: dialog.parentId };
  }, [dialog]);

  const openCreate = (parent: MfeNavItemDto | null) => {
    setDialogError(null);
    setDialog({
      mode: 'create',
      parentId: parent?.id ?? '',
      sortOrder: parent ? (parent.children ?? []).length : tree.length,
    });
  };

  const saveItem = async (values: NavItemForm) => {
    if (!dialog) return;
    setDialogError(null);
    startSaving();
    try {
      if (dialog.mode === 'create') {
        await createNavItem(id, toCreateNavItemBody(values, dialog.sortOrder));
        onNotify?.({ level: 'success', message: 'Nav item created' });
      } else {
        await updateNavItem(id, dialog.item.id, toUpdateNavItemBody(values));
        onNotify?.({ level: 'success', message: 'Nav item updated' });
      }
      setDialog(null);
      await load();
    } catch (err) {
      setDialogError(describeApiError(err));
    } finally {
      stopSaving();
    }
  };

  const moveItem = async (
    item: MfeNavItemDto,
    siblings: MfeNavItemDto[],
    direction: -1 | 1,
  ) => {
    const entries = moveSibling(siblings, item.id, direction);
    if (!entries) return;
    startMutating();
    setError(null);
    try {
      const next = await reorderNavItems(id, entries);
      setTree(next);
      onNotify?.({ level: 'success', message: 'Nav order updated' });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      stopMutating();
    }
  };

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
        spacing={2}
      >
        <Box>
          <Button component={RouterLink} to=".." size="small" sx={{ mb: 1 }}>
            Back to config
          </Button>
          <Typography variant="h6">
            Nav{config ? ` · ${config.title}` : ''}
          </Typography>
          {config ? (
            <Typography variant="body2" color="text.secondary">
              Sidebar for <code>{config.routeName}</code>. Scope-gated per node;
              keep nesting to 3 levels when you can (server cap is 5).
            </Typography>
          ) : null}
        </Box>
        <Button
          variant="contained"
          size="small"
          disabled={mutating || deletion.busy}
          onClick={() => openCreate(null)}
        >
          Add root item
        </Button>
      </Stack>

      <ErrorAlert message={error} />

      <NavTreeEditor
        tree={tree}
        busy={mutating || deletion.busy}
        onAddChild={(parent) => openCreate(parent)}
        onEdit={(item) => {
          setDialogError(null);
          setDialog({ mode: 'edit', item });
        }}
        onDelete={deletion.ask}
        onMove={moveItem}
      />

      <NavItemDialog
        open={Boolean(dialog)}
        mode={dialog?.mode === 'edit' ? 'edit' : 'create'}
        initialValues={initialValues}
        parentOptions={parentOptions}
        scopeOptions={options}
        scopesError={scopesError}
        busy={saving}
        error={dialogError}
        onClose={() => {
          if (!saving) setDialog(null);
        }}
        onSubmit={(values) => {
          void saveItem(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletion.target)}
        title="Delete nav item?"
        description={
          deletion.target
            ? `Delete "${deletion.target.title}" and all nested children?`
            : ''
        }
        busy={deletion.busy}
        onCancel={deletion.cancel}
        onConfirm={() => void deletion.confirm()}
      />
    </Box>
  );
}
