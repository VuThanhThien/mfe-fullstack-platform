/**
 * Header Apps control — same accessible grid as Home; navigate + close.
 */
import type { MfeAccessibleItem } from '@mfe/sdk';
import AppsIcon from '@mui/icons-material/Apps';
import { Box, IconButton, Popover, Typography } from '@mui/material';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLauncherGrid } from './AppLauncherGrid';

interface AppsPopoverProps {
  items: MfeAccessibleItem[];
  selectedRouteName?: string;
}

export function AppsPopover({ items, selectedRouteName }: AppsPopoverProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const id = useId();

  function handleSelect(item: MfeAccessibleItem) {
    setAnchorEl(null);
    navigate(`/${item.routeName}`);
  }

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Applications"
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        aria-controls={open ? id : undefined}
        data-testid="apps-menu-button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <AppsIcon />
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box
          sx={{ p: 2, width: 360, maxWidth: '100vw' }}
          data-testid="apps-popover"
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Applications
          </Typography>
          <AppLauncherGrid
            items={items}
            selectedRouteName={selectedRouteName}
            onSelect={handleSelect}
            dense
          />
        </Box>
      </Popover>
    </>
  );
}
