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
import { CHART_HEIGHT, tooltipStyle, gridProps } from "./chart-config";

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
    <div style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => formatCurrency(v, currency, rate).replace(/ /g, " ")}
            width={90}
          />
          <Tooltip
            contentStyle={tooltipStyle}
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
