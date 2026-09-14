import { Card, CardContent, CardHeader, useTheme } from '@mui/material';
import { PolarAngleAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from './recharts-compat.js';

export type BudgetPoint = { subject: string; value: number };

export type BudgetWidgetProps = {
  title: string;
  series?: BudgetPoint[];
  legendName?: string;
  height?: number;
};

export function BudgetWidget({
  title,
  series = [],
  legendName = 'Budget',
  height = 244,
}: BudgetWidgetProps) {
  const theme = useTheme();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {series.length === 0 ? null : (
          <ResponsiveContainer width="99%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={series}>
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: theme.palette.text.secondary, fontSize: 14 }}
              />
              <Radar
                name={legendName}
                dataKey="value"
                stroke={theme.palette.primary.main}
                strokeWidth={8}
                fill={theme.palette.primary.main}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  boxShadow: theme.shadows[3],
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.background.paper,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
