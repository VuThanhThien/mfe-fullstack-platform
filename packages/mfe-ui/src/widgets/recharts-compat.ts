/**
 * Recharts + dual @types/react (18 vs 19 via transitive deps) breaks JSX element
 * assignability under tsc. Cast once here; runtime is unchanged.
 */
import type { ComponentType } from 'react';
import {
  Area as AreaBase,
  AreaChart as AreaChartBase,
  Bar as BarBase,
  BarChart as BarChartBase,
  Legend as LegendBase,
  Line as LineBase,
  LineChart as LineChartBase,
  Pie as PieBase,
  PieChart as PieChartBase,
  PolarAngleAxis as PolarAngleAxisBase,
  Radar as RadarBase,
  RadarChart as RadarChartBase,
  RadialBar as RadialBarBase,
  RadialBarChart as RadialBarChartBase,
  ResponsiveContainer as ResponsiveContainerBase,
  Tooltip as TooltipBase,
  XAxis as XAxisBase,
} from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any;

export const ResponsiveContainer =
  ResponsiveContainerBase as unknown as ComponentType<AnyProps>;
export const LineChart = LineChartBase as unknown as ComponentType<AnyProps>;
export const Line = LineBase as unknown as ComponentType<AnyProps>;
export const XAxis = XAxisBase as unknown as ComponentType<AnyProps>;
export const Tooltip = TooltipBase as unknown as ComponentType<AnyProps>;
export const AreaChart = AreaChartBase as unknown as ComponentType<AnyProps>;
export const Area = AreaBase as unknown as ComponentType<AnyProps>;
export const BarChart = BarChartBase as unknown as ComponentType<AnyProps>;
export const Bar = BarBase as unknown as ComponentType<AnyProps>;
export const RadarChart = RadarChartBase as unknown as ComponentType<AnyProps>;
export const Radar = RadarBase as unknown as ComponentType<AnyProps>;
export const PolarAngleAxis =
  PolarAngleAxisBase as unknown as ComponentType<AnyProps>;
export const RadialBarChart =
  RadialBarChartBase as unknown as ComponentType<AnyProps>;
export const RadialBar = RadialBarBase as unknown as ComponentType<AnyProps>;
export const PieChart = PieChartBase as unknown as ComponentType<AnyProps>;
export const Pie = PieBase as unknown as ComponentType<AnyProps>;
export const Legend = LegendBase as unknown as ComponentType<AnyProps>;
