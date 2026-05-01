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
    <div className="h-[280px]">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCurrency(v, currency, rate)}
          />
          <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={120} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
