import { Card, CardContent, CardHeader, useTheme } from '@mui/material';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from './recharts-compat.js';

export type ActivityPoint = { name: string; value: number };

export type ActivityWidgetProps = {
  title: string;
  series?: ActivityPoint[];
  seriesName?: string;
  height?: number;
};

export function ActivityWidget({
  title,
  series = [],
  seriesName = 'Value',
  height = 244,
}: ActivityWidgetProps) {
  const theme = useTheme();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {series.length === 0 ? null : (
          <ResponsiveContainer width="99%" height={height}>
            <LineChart
              data={series}
              margin={{ top: 5, right: 16, left: 16, bottom: 5 }}
            >
              <XAxis
                axisLine={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                tickLine={false}
                dataKey="name"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  boxShadow: theme.shadows[3],
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.background.paper,
                }}
              />
              <Line
                name={seriesName}
                type="monotone"
                dataKey="value"
                stroke={theme.palette.primary.main}
                strokeWidth={6}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
