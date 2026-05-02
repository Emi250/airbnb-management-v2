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

export function OccupancyBarChart({
  data,
  properties,
}: {
  data: Array<Record<string, string | number>>;
  properties: Property[];
}) {
  return (
    <div style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {properties.map((p) => (
            <Bar
              key={p.id}
              dataKey={p.name}
              stackId="occ"
              fill={p.color_hex ?? "#A47148"}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
