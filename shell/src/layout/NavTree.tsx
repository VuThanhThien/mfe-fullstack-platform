/**
 * Nested nav for the current MfeConfig. Groups collapse; leaves Link to
 * `/{routeName}/{path}`. Hidden nodes are not ACL — deep links still mount.
 */
import type { MfeNavNode } from '@mfe/sdk';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppNav } from '../context/NavContext';
import { leafHref, matchActiveLeafId } from '../nav/active-leaf';
import { useShellPathname } from '../nav/use-shell-pathname';
import { AppIcon } from './AppIcon';

interface NavTreeProps {
  collapsed: boolean;
  onLeafClick: () => void;
}

export function NavTree({ collapsed, onLeafClick }: NavTreeProps) {
  const { routeName } = useParams<{ routeName?: string }>();
  const pathname = useShellPathname();
  const { status, tree, message, retry } = useAppNav(routeName);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  if (!routeName) {
    return (
      <Box sx={{ p: 2 }}>
        {!collapsed && (
          <Typography variant="body2" color="text.secondary" align="center">
            Select an app
          </Typography>
        )}
      </Box>
    );
  }

  if (status === 'idle') {
    return (
      <Box sx={{ p: 2 }}>
        {!collapsed && (
          <Typography variant="body2" color="text.secondary" align="center">
            No menu items
          </Typography>
        )}
      </Box>
    );
  }

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        <Alert
          severity="error"
          sx={{ mb: collapsed ? 0 : 1 }}
          action={
            collapsed ? undefined : (
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={retry}
              >
                Retry
              </Button>
            )
          }
        >
          {!collapsed && (message ?? "Could not load this app's menu.")}
        </Alert>
        {collapsed ? (
          <Button size="small" onClick={retry} sx={{ mt: 1 }} fullWidth>
            Retry
          </Button>
        ) : null}
      </Box>
    );
  }

  if (tree.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        {!collapsed && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            data-testid="nav-tree-empty"
          >
            No menu items
          </Typography>
        )}
      </Box>
    );
  }

  const activeId = matchActiveLeafId(tree, routeName, pathname);

  function toggle(id: string) {
    setClosed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <List
      component="nav"
      dense
      sx={{ px: collapsed ? 1 : 1 }}
      data-testid="nav-tree"
    >
      {tree.map((node) => (
        <NavNodeItem
          key={node.id}
          node={node}
          routeName={routeName}
          activeId={activeId}
          collapsed={collapsed}
          depth={0}
          closed={closed}
          onToggle={toggle}
          onLeafClick={onLeafClick}
        />
      ))}
    </List>
  );
}

interface NavNodeItemProps {
  node: MfeNavNode;
  routeName: string;
  activeId: string | null;
  collapsed: boolean;
  depth: number;
  closed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onLeafClick: () => void;
}

function NavNodeItem({
  node,
  routeName,
  activeId,
  collapsed,
  depth,
  closed,
  onToggle,
  onLeafClick,
}: NavNodeItemProps) {
  const icon = (
    <AppIcon
      title={node.title}
      iconUrl={node.iconUrl}
      size={28}
      selected={node.id === activeId}
    />
  );

  if (node.type === 'group') {
    const open = !closed[node.id] || collapsed;
    const button = (
      <ListItemButton
        onClick={() => onToggle(node.id)}
        sx={{
          borderRadius: 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
          pl: collapsed ? 1 : 2 + depth * 1.5,
          pr: collapsed ? 1 : 2,
        }}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40 }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={node.title}
          primaryTypographyProps={{ noWrap: true }}
          sx={{ display: collapsed ? 'none' : 'block' }}
        />
        {!collapsed && (open ? <ExpandLess /> : <ExpandMore />)}
      </ListItemButton>
    );

    return (
      <>
        <ListItem disablePadding sx={{ mb: 0.25 }}>
          {collapsed ? (
            <Tooltip title={node.title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          )}
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit={!collapsed}>
          <List component="div" disablePadding>
            {node.children.map((child) => (
              <NavNodeItem
                key={child.id}
                node={child}
                routeName={routeName}
                activeId={activeId}
                collapsed={collapsed}
                depth={depth + 1}
                closed={closed}
                onToggle={onToggle}
                onLeafClick={onLeafClick}
              />
            ))}
          </List>
        </Collapse>
      </>
    );
  }

  if (node.type !== 'route') return null;

  const to = leafHref(routeName, node.path ?? '');
  const selected = node.id === activeId;
  const button = (
    <ListItemButton
      selected={selected}
      component={Link}
      to={to}
      onClick={onLeafClick}
      sx={{
        borderRadius: 1,
        justifyContent: collapsed ? 'center' : 'flex-start',
        pl: collapsed ? 1 : 2 + depth * 1.5,
        pr: collapsed ? 1 : 2,
      }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={node.title}
        primaryTypographyProps={{ noWrap: true }}
        sx={{ display: collapsed ? 'none' : 'block' }}
      />
    </ListItemButton>
  );

  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      {collapsed ? (
        <Tooltip title={node.title} placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </ListItem>
  );
}
