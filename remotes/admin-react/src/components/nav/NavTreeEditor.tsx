import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { canAddChild, flattenNavTree } from '../../lib/nav-tree';
import type { MfeNavItemDto } from '../../lib/types';

interface NavTreeEditorProps {
  tree: MfeNavItemDto[];
  busy: boolean;
  onAddChild: (parent: MfeNavItemDto) => void;
  onEdit: (item: MfeNavItemDto) => void;
  onDelete: (item: MfeNavItemDto) => void;
  onMove: (
    item: MfeNavItemDto,
    siblings: MfeNavItemDto[],
    direction: -1 | 1,
  ) => void;
}

export function NavTreeEditor({
  tree,
  busy,
  onAddChild,
  onEdit,
  onDelete,
  onMove,
}: NavTreeEditorProps) {
  if (tree.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No menu items yet. Add a root item to start this app&apos;s sidebar.
      </Typography>
    );
  }

  const rows = flattenNavTree(tree);

  return (
    <Stack spacing={1}>
      {rows.map(({ item, depth, siblings, index }) => (
        <Stack
          key={item.id}
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ pl: (depth - 1) * 3 }}
        >
          {item.iconUrl ? (
            <Box
              component="img"
              src={item.iconUrl}
              alt=""
              sx={{ width: 20, height: 20, objectFit: 'contain' }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <Typography variant="body2" fontWeight={600}>
            {item.title}
          </Typography>
          <Chip
            size="small"
            label={item.type}
            color={item.type === 'route' ? 'primary' : 'default'}
            variant="outlined"
          />
          {item.path ? (
            <Typography
              variant="caption"
              color="text.secondary"
              component="code"
            >
              {item.path}
            </Typography>
          ) : null}
          {item.scopeNames.map((name) => (
            <Chip key={name} size="small" label={name} />
          ))}
          <Stack direction="row" spacing={0.5} sx={{ ml: 'auto' }}>
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move ${item.title} up`}
                  disabled={busy || index === 0}
                  onClick={() => onMove(item, siblings, -1)}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move ${item.title} down`}
                  disabled={busy || index === siblings.length - 1}
                  onClick={() => onMove(item, siblings, 1)}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              size="small"
              disabled={busy || !canAddChild(depth, item.type)}
              onClick={() => onAddChild(item)}
            >
              Add child
            </Button>
            <Button size="small" disabled={busy} onClick={() => onEdit(item)}>
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              disabled={busy}
              onClick={() => onDelete(item)}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
