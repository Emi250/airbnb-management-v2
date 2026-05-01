"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";

const COLORS = ["#FF5A5F", "#003580", "#A47148", "#6B7280"];

export function SourceBar({
  data,
  currency,
  rate,
}: {
  data: { source: string; revenue: number }[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCurrency(v, currency, rate)}
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
