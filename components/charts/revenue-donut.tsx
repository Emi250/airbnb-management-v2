"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle } from "./chart-config";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

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
    return (
      <div
        style={{ height: CHART_HEIGHT }}
        className="flex items-center justify-center text-sm text-muted-foreground"
        role="img"
        aria-label="Ingresos por propiedad — sin datos en el período"
      >
        Sin datos para el período seleccionado
      </div>
    );
  }
  return (
    <div
      style={{ height: CHART_HEIGHT }}
      role="img"
      aria-label="Ingresos por propiedad, año en curso (YTD)"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d, idx) => (
              <Cell
                key={d.name}
                fill={d.color && d.color !== "#A47148" ? d.color : CHART_PALETTE[idx % CHART_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
