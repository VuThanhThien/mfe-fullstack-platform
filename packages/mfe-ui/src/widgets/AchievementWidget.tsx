import StarIcon from '@mui/icons-material/Star';
import { Avatar, Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type AchievementWidgetProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AchievementWidget({
  title,
  description,
  action,
}: AchievementWidgetProps) {
  return (
    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Avatar sx={{ bgcolor: 'secondary.main', mb: 3 }}>
          <StarIcon color="primary" />
        </Avatar>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        <Typography marginBottom={3} variant="body2">
          {description}
        </Typography>
        {action ? <Box>{action}</Box> : null}
      </CardContent>
    </Card>
  );
}
