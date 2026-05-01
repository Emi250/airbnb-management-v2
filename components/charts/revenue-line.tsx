"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate, Property } from "@/types/supabase";

export function RevenueLineChart({
  data,
  properties,
  currency,
  rate,
}: {
  data: Array<Record<string, string | number>>;
  properties: Property[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCurrency(v, currency, rate).replace(/ /g, " ")}
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {properties.map((p) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.name}
              stroke={p.color_hex ?? "#A47148"}
              strokeWidth={1.5}
              dot={{ r: 2 }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="Total"
            stroke="var(--foreground)"
            strokeWidth={2.2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
