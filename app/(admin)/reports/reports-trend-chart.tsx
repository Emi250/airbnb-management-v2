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
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import type { Property } from "@/types/supabase";
import { CHART_HEIGHT, tooltipStyle, gridProps } from "@/components/charts/chart-config";
import { lastNMonths } from "./reports-utils";

const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Reservation = {
  property_id: string;
  check_in: string;
  total_amount_ars: number;
  status: string;
};

export function ReportsTrendChart({
  reservations,
  properties,
}: {
  reservations: Reservation[];
  properties: Property[];
}) {
  if (properties.length === 0) {
    return (
      <div
        style={{ height: CHART_HEIGHT }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        Sin propiedades para graficar.
      </div>
    );
  }

  const months = lastNMonths(6);
  const data = months.map((ym) => {
    const row: Record<string, string | number> = {
      month: format(parse(ym, "yyyy-MM", new Date()), "MMM yy", { locale: es }),
    };
    for (const p of properties) row[p.name] = 0;
    return row;
  });
  const monthIndex = new Map(months.map((ym, i) => [ym, i]));
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  for (const r of reservations) {
    if (r.status === "cancelled") continue;
    const ym = r.check_in.slice(0, 7);
    const idx = monthIndex.get(ym);
    if (idx === undefined) continue;
    const prop = propertyById.get(r.property_id);
    if (!prop) continue;
    data[idx][prop.name] =
      Number(data[idx][prop.name] ?? 0) + Number(r.total_amount_ars);
  }

  const hasData = data.some((row) =>
    properties.some((p) => Number(row[p.name] ?? 0) > 0)
  );

  if (!hasData) {
    return (
      <div
        style={{ height: CHART_HEIGHT }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        Sin ingresos en los últimos 6 meses.
      </div>
    );
  }

  return (
    <div style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                  ? `${Math.round(v / 1_000)}k`
                  : String(v)
            }
            width={56}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
          {properties.map((p, idx) => (
            <Bar
              key={p.id}
              dataKey={p.name}
              stackId="revenue"
              fill={p.color_hex ?? CHART_PALETTE[idx % CHART_PALETTE.length]}
              radius={
                idx === properties.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
