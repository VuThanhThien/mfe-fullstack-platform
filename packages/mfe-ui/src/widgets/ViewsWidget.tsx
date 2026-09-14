import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Avatar, Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from './recharts-compat.js';

export type ViewsSeriesPoint = { name: string; value: number };

export type ViewsWidgetProps = {
  unitLabel: string;
  total: string;
  series?: ViewsSeriesPoint[];
  actionLabel?: string;
  action?: ReactNode;
};

export function ViewsWidget({
  unitLabel,
  total,
  series = [],
  actionLabel,
  action,
}: ViewsWidgetProps) {
  const theme = useTheme();

  return (
    <Card>
      <CardContent>
        <Typography align="center" component="div" marginBottom={2} variant="body2">
          {unitLabel}
        </Typography>
        <Typography align="center" component="div" variant="h2">
          {total}
        </Typography>
        <Box sx={{ height: 224 }}>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  interval="preserveStartEnd"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    boxShadow: theme.shadows[3],
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.background.paper,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill={theme.palette.primary.main}
                  fillOpacity={0.3}
                  stroke={theme.palette.primary.main}
                  strokeWidth={6}
                  activeDot={{ r: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </Box>
        {actionLabel || action ? (
          <Card sx={{ bgcolor: 'background.default', mt: 5 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'background.paper', mr: 2 }}>
                <DashboardIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography component="div" variant="h6">
                  {actionLabel}
                </Typography>
              </Box>
              {action}
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}
