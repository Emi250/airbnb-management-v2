"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { ExpenseCategory } from "@/types/supabase";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/reservation-options";
import { tooltipStyle } from "./chart-config";

export const EXPENSE_CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  cleaning: "#60a5fa",
  maintenance: "#f59e0b",
  utilities: "#10b981",
  supplies: "#a78bfa",
  tax: "#ef4444",
  other: "#94a3b8",
  fixed: "#A47148",
};

export function ExpenseDonut({
  totalsByCategory,
  height = 220,
}: {
  totalsByCategory: Record<string, number>;
  height?: number;
}) {
  const data = Object.entries(totalsByCategory)
    .filter(([, v]) => v > 0)
    .map(([category, value]) => ({
      name: EXPENSE_CATEGORY_LABEL[category as ExpenseCategory] ?? category,
      value,
      color:
        EXPENSE_CATEGORY_COLOR[category as ExpenseCategory] ?? "#94a3b8",
    }));

  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay gastos en el período seleccionado.
      </p>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
