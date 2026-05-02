"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle, gridProps } from "./chart-config";

export function TopGuestsBar({
  data,
  currency,
  rate,
}: {
  data: { name: string; total: number }[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin huéspedes registrados.</p>;
  }
  return (
    <div style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCurrency(v, currency, rate)}
          />
          <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={120} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
