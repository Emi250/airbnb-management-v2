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

export function OccupancyBarChart({
  data,
  properties,
}: {
  data: Array<Record<string, string | number>>;
  properties: Property[];
}) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
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
