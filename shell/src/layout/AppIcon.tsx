/**
 * Launcher / nav icon. Broken HTTPS URLs fall back to the title initial —
 * never render iconUrl as HTML.
 */
import { Avatar } from '@mui/material';
import { useEffect, useState } from 'react';

interface AppIconProps {
  title: string;
  iconUrl?: string;
  size?: number;
  selected?: boolean;
}

export function AppIcon({
  title,
  iconUrl,
  size = 40,
  selected = false,
}: AppIconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [iconUrl]);

  const initial = (title.trim()[0] ?? '?').toUpperCase();
  const src = iconUrl && !failed ? iconUrl : undefined;

  return (
    <Avatar
      src={src}
      alt=""
      slotProps={{
        img: {
          onError: () => setFailed(true),
        },
      }}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        bgcolor: selected ? 'primary.main' : 'action.hover',
        color: selected ? 'primary.contrastText' : 'text.primary',
      }}
    >
      {initial}
    </Avatar>
  );
}
