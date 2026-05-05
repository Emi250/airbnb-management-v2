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
  ReferenceLine,
} from "recharts";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate, Property } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle, gridProps } from "./chart-config";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RevenueLineChart({
  data,
  properties,
  currency,
  rate,
  target,
  ariaLabel,
}: {
  data: Array<Record<string, string | number>>;
  properties: Property[];
  currency: Currency;
  rate: ExchangeRate;
  /** When provided, draws a dashed neutral target line. Pass null when no target is set. */
  target?: number | null;
  ariaLabel?: string;
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
        aria-label="Ingresos mensuales — sin datos en el período"
      >
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <div
      style={{ height: CHART_HEIGHT }}
      role="img"
      aria-label={
        ariaLabel ??
        "Ingresos mensuales por propiedad, últimos 12 meses" +
          (target ? ", con línea objetivo del mes en curso" : "")
      }
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
            tickFormatter={(v: number) => formatCurrency(v, currency, rate)}
            width={90}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(value, currency, rate)}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
          {properties.map((p, idx) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.name}
              stroke={p.color_hex ?? CHART_PALETTE[idx % CHART_PALETTE.length]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="Total"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            strokeOpacity={0.6}
            dot={false}
          />
          {target != null && target > 0 ? (
            <ReferenceLine
              y={target}
              stroke="var(--target-track)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Objetivo",
                position: "right",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
              ifOverflow="extendDomain"
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
