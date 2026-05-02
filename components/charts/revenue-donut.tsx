"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle } from "./chart-config";

export function RevenueDonut({
  data,
  currency,
  rate,
}: {
  data: { name: string; value: number; color: string }[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en el período.</p>;
  }
  return (
    <div style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
