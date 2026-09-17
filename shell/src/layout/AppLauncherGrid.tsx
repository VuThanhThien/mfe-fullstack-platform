/**
 * Shared accessible-app grid: Home launcher + header Apps popover.
 */
import type { MfeAccessibleItem } from '@mfe/sdk';
import { Box, ButtonBase, Typography } from '@mui/material';
import { AppIcon } from './AppIcon';

interface AppLauncherGridProps {
  items: MfeAccessibleItem[];
  onSelect: (item: MfeAccessibleItem) => void;
  selectedRouteName?: string;
  /** Compact tiles for the header popover. */
  dense?: boolean;
}

export function AppLauncherGrid({
  items,
  onSelect,
  selectedRouteName,
  dense = false,
}: AppLauncherGridProps) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No apps available.
      </Typography>
    );
  }

  const min = dense ? 96 : 140;
  const iconSize = dense ? 40 : 56;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
        gap: dense ? 1 : 2,
      }}
    >
      {items.map((item) => {
        const selected = selectedRouteName === item.routeName;
        return (
          <ButtonBase
            key={item.routeName}
            onClick={() => onSelect(item)}
            focusRipple
            aria-label={item.title}
            data-testid={`launcher-tile-${item.routeName}`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              p: dense ? 1 : 2,
              borderRadius: 2,
              border: 1,
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: selected ? 'action.selected' : 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <AppIcon
              title={item.title}
              iconUrl={item.iconUrl}
              size={iconSize}
              selected={selected}
            />
            <Typography
              variant="body2"
              noWrap
              sx={{ width: '100%', textAlign: 'center' }}
            >
              {item.title}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
