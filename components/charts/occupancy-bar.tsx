"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Property } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle, gridProps } from "./chart-config";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function OccupancyBarChart({
  data,
  properties,
}: {
  data: Array<Record<string, string | number>>;
  properties: Property[];
}) {
  const hasData =
    properties.length > 0 &&
    data.some((row) => properties.some((p) => Number(row[p.name] ?? 0) > 0));

  if (!hasData) {
    return (
      <div
        style={{ height: CHART_HEIGHT }}
        className="flex items-center justify-center text-sm text-muted-foreground"
        role="img"
        aria-label="Ocupación mensual — sin datos en el período"
      >
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <div
      style={{ height: CHART_HEIGHT }}
      role="img"
      aria-label="Ocupación mensual por propiedad, últimos 12 meses"
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="month"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
          {properties.map((p, idx) => (
            <Bar
              key={p.id}
              dataKey={p.name}
              stackId="occ"
              fill={p.color_hex ?? CHART_PALETTE[idx % CHART_PALETTE.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
