import { Card, CardContent, CardHeader, useTheme } from '@mui/material';
import {
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from './recharts-compat.js';

export type AgePoint = { name: string; value: number; fill?: string };

export type SalesByAgeWidgetProps = {
  title: string;
  series?: AgePoint[];
  height?: number;
};

export function SalesByAgeWidget({
  title,
  series = [],
  height = 244,
}: SalesByAgeWidgetProps) {
  const theme = useTheme();
  const defaults = [
    theme.palette.text.secondary,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.primary.main,
  ];
  const data = series.map((d, i) => ({
    name: d.name,
    uv: d.value,
    fill: d.fill ?? defaults[i % defaults.length],
  }));

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {data.length === 0 ? null : (
          <ResponsiveContainer width="99%" height={height}>
            <RadialBarChart
              barGap={1}
              innerRadius="15%"
              outerRadius="100%"
              barSize={16}
              data={data}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                dataKey="uv"
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: theme.palette.background.default }}
                cornerRadius={16}
                label={{
                  position: 'insideStart',
                  fill: '#fff',
                  fontWeight: 700,
                }}
                dataKey="uv"
              />
              <Legend
                align="right"
                wrapperStyle={{ fontWeight: 700 }}
                iconSize={16}
                layout="vertical"
                verticalAlign="middle"
              />
            </RadialBarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
