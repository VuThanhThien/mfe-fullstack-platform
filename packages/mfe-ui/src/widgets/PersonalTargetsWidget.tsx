import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import { clampPercent } from './clamp.js';

export type TargetItem = { key: string; label: string; value: number };

export type PersonalTargetsWidgetProps = {
  title: string;
  targets: TargetItem[];
};

export function PersonalTargetsWidget({ title, targets }: PersonalTargetsWidgetProps) {
  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader title={title} />
      <CardContent>
        <List>
          {targets.map((target) => {
            const value = clampPercent(target.value);
            return (
              <ListItem disableGutters key={target.key}>
                <ListItemText>
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    <Typography component="div" variant="h6">
                      {target.label}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography component="div" variant="h6">
                      {`${value}%`}
                    </Typography>
                  </Box>
                  <LinearProgress
                    aria-label={`${target.label} progress`}
                    sx={{
                      color:
                        value >= 75
                          ? 'primary.main'
                          : value <= 25
                            ? 'error.main'
                            : 'warning.main',
                    }}
                    color="inherit"
                    variant="determinate"
                    value={value}
                  />
                </ListItemText>
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
