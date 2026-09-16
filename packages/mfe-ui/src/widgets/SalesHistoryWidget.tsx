import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  useTheme,
} from '@mui/material';
import { Bar, BarChart, ResponsiveContainer } from './recharts-compat.js';

export type SalesHistoryPoint = { name: string; value: number };

export type SalesHistoryWidgetProps = {
  title: string;
  value: number | string;
  unitLabel: string;
  series?: SalesHistoryPoint[];
  height?: number;
};

export function SalesHistoryWidget({
  title,
  value,
  unitLabel,
  series = [],
  height = 124,
}: SalesHistoryWidgetProps) {
  const theme = useTheme();

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        {series.length === 0 ? null : (
          <ResponsiveContainer width="99%" height={height}>
            <BarChart data={series} margin={{ right: 0, left: 0 }}>
              <Bar
                dataKey="value"
                fill={theme.palette.primary.main}
                radius={[50, 50, 50, 50]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h2" component="div" marginBottom={1}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              {unitLabel}
            </Typography>
          </Box>
          <TrendingUpIcon sx={{ color: 'text.secondary' }} />
        </Box>
      </CardContent>
    </Card>
  );
}
