import type { ReactNode } from 'react';
import { Card, CardContent, Avatar, Box, Typography, LinearProgress } from '@mui/material';
import { clampPercent } from './clamp.js';

export type ProgressWidgetProps = {
  avatar: ReactNode;
  mb?: number;
  title: string;
  value: number;
};

export function ProgressWidget({ avatar, mb = 0, title, value }: ProgressWidgetProps) {
  const clamped = clampPercent(value);
  return (
    <Card sx={{ mb }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ mr: 2 }}>{avatar}</Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', mb: 1 }}>
            <Typography component="div" variant="h6">
              {title}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography component="div" color="text.secondary">
              {`${clamped}%`}
            </Typography>
          </Box>
          <LinearProgress
            aria-label={`${title} progress`}
            sx={{ height: 8 }}
            variant="determinate"
            value={clamped}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
