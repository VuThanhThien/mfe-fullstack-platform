import type { ReactNode } from 'react';
import { Card, CardContent, Avatar, Box, Typography } from '@mui/material';

export type FollowerStat = {
  key: string;
  label: string;
  value: string;
  bgcolor: string;
  icon: ReactNode;
  trend?: ReactNode;
};

export type FollowersWidgetProps = {
  items: FollowerStat[];
};

export function FollowersWidget({ items }: FollowersWidgetProps) {
  return (
    <>
      {items.map((social) => (
        <Card key={social.key} sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar aria-label={`${social.label} avatar`} sx={{ bgcolor: social.bgcolor, mr: 2 }}>
              {social.icon}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography component="div" variant="h6">
                {social.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                {social.label}
              </Typography>
            </Box>
            {social.trend}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
