"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from "recharts";

import { getChartTheme } from "./ChartTheme";
import { formatMetricValue } from "@/lib/analytics/formatters";
import type { MetricFormat } from "@/lib/analytics/metrics";

export type TimeSeriesPoint = {
  date: string;
  value: number;
  comparisonValue?: number;
};

type BaseTimeSeriesChartProps = {
  data: TimeSeriesPoint[];
  format: MetricFormat;
  chartType?: "line" | "area" | "bar";
  showComparison?: boolean;
  yAxisLabel?: string;
};

const CustomTooltip: React.FC<
  TooltipProps<number, string> & { format: MetricFormat }
> = (props) => {
  const { active, payload, label, format } = props as any;
  if (!active || !payload || payload.length === 0) return null;

  const main = payload.find((p: any) => p.dataKey === "value");
  const comparison = payload.find((p: any) => p.dataKey === "comparisonValue");
  const theme = getChartTheme();

  return (
    <div
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: 12,
        padding: "8px 10px",
        fontSize: 11,
        color: theme.tooltipText,
        minWidth: 160,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div style={{ opacity: 0.7, marginBottom: 4 }}>{label}</div>
      {main && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Value</span>
          <span style={{ fontWeight: 600 }}>
            {formatMetricValue(main.value ?? 0, format)}
          </span>
        </div>
      )}
      {comparison && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
            opacity: 0.8,
          }}
        >
          <span>Comparison</span>
          <span>
            {formatMetricValue(comparison.value ?? 0, format)}
          </span>
        </div>
      )}
    </div>
  );
};

export const BaseTimeSeriesChart: React.FC<BaseTimeSeriesChartProps> = ({
  data,
  format,
  chartType = "area",
  showComparison = false,
  yAxisLabel,
}) => {
  const ChartImpl =
    chartType === "line" ? LineChart : chartType === "bar" ? BarChart : AreaChart;
  
  // Use state to track theme and update when it changes
  const [theme, setTheme] = React.useState(getChartTheme());
  
  // Generate unique gradient ID for this chart instance
  const gradientId = React.useMemo(() => `primaryArea-${Math.random().toString(36).substr(2, 9)}`, []);
  
  React.useEffect(() => {
    const updateTheme = () => setTheme(getChartTheme());
    
    // Update theme on mount and when DOM changes (theme class changes)
    updateTheme();
    
    // Use MutationObserver to watch for theme class changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={280} minHeight={200}>
      <ChartImpl
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme.grid}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: theme.axis }}
          minTickGap={20}
        />
        <YAxis
          tick={{ fill: theme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: theme.axis }}
          tickFormatter={(v) => formatMetricValue(v as number, format)}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fill: theme.axisLabel,
                    fontSize: 11,
                  },
                }
              : undefined
          }
        />
        <Tooltip
          content={<CustomTooltip format={format} />}
          cursor={{ stroke: theme.muted, strokeWidth: 1 }}
        />

        {chartType === "line" && (
          <>
            <Line
              type="monotone"
              dataKey="value"
              stroke={theme.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="comparisonValue"
                stroke={theme.secondary}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
              />
            )}
          </>
        )}

        {chartType === "area" && (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.primary} stopOpacity={0.7} />
                <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={theme.primary}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="comparisonValue"
                stroke={theme.secondary}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
              />
            )}
          </>
        )}

        {chartType === "bar" && (
          <>
            <Bar
              dataKey="value"
              fill={theme.primary}
              radius={[6, 6, 0, 0]}
            />
            {showComparison && (
              <Bar
                dataKey="comparisonValue"
                fill={theme.secondary}
                radius={[6, 6, 0, 0]}
              />
            )}
          </>
        )}
      </ChartImpl>
    </ResponsiveContainer>
  );
};
