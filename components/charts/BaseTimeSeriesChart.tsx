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

import { chartTheme } from "./ChartTheme";
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

  return (
    <div
      style={{
        background: chartTheme.tooltipBg,
        border: `1px solid ${chartTheme.tooltipBorder}`,
        borderRadius: 12,
        padding: "8px 10px",
        fontSize: 11,
        color: chartTheme.tooltipText,
        minWidth: 160,
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

  return (
    <ResponsiveContainer width="100%" height={280} minHeight={200}>
      <ChartImpl
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartTheme.grid}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: chartTheme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: chartTheme.axis }}
          minTickGap={20}
        />
        <YAxis
          tick={{ fill: chartTheme.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: chartTheme.axis }}
          tickFormatter={(v) => formatMetricValue(v as number, format)}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fill: chartTheme.axisLabel,
                    fontSize: 11,
                  },
                }
              : undefined
          }
        />
        <Tooltip
          content={<CustomTooltip format={format} />}
          cursor={{ stroke: chartTheme.muted, strokeWidth: 1 }}
        />

        {chartType === "line" && (
          <>
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartTheme.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="comparisonValue"
                stroke={chartTheme.secondary}
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
              <linearGradient id="primaryArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.7} />
                <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartTheme.primary}
              strokeWidth={2}
              fill="url(#primaryArea)"
              dot={false}
            />
            {showComparison && (
              <Line
                type="monotone"
                dataKey="comparisonValue"
                stroke={chartTheme.secondary}
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
              fill={chartTheme.primary}
              radius={[6, 6, 0, 0]}
            />
            {showComparison && (
              <Bar
                dataKey="comparisonValue"
                fill={chartTheme.secondary}
                radius={[6, 6, 0, 0]}
              />
            )}
          </>
        )}
      </ChartImpl>
    </ResponsiveContainer>
  );
};
