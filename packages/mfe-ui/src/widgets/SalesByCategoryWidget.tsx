import { Card, CardContent, CardHeader, useTheme } from '@mui/material';
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from './recharts-compat.js';

export type CategoryPoint = { name: string; value: number; fill?: string };

export type SalesByCategoryWidgetProps = {
  title: string;
  series?: CategoryPoint[];
  height?: number;
};

export function SalesByCategoryWidget({
  title,
  series = [],
  height = 244,
}: SalesByCategoryWidgetProps) {
  const theme = useTheme();
  const data = series.map((d, i) => ({
    ...d,
    fill:
      d.fill ??
      [theme.palette.primary.main, theme.palette.warning.main, theme.palette.error.main][i % 3],
  }));

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {data.length === 0 ? null : (
          <ResponsiveContainer width="99%" height={height}>
            <PieChart>
              <Pie
                dataKey="value"
                isAnimationActive={false}
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                stroke={theme.palette.background.paper}
                strokeWidth={8}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  boxShadow: theme.shadows[3],
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.background.paper,
                }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
              <Legend wrapperStyle={{ fontSize: 14 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
