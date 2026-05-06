"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Coins, Wallet, Percent } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

export type KpiSummary = {
  reservationCount: number;
  totalRevenue: number;
  paid: number;
  pending: number;
  occupiedNights: number;
  availableNights: number;
};

export function ReportsKpis({ summary }: { summary: KpiSummary }) {
  const occupancy =
    summary.availableNights > 0
      ? summary.occupiedNights / summary.availableNights
      : 0;

  const items = [
    {
      label: "Reservas",
      value: summary.reservationCount.toLocaleString("es-AR"),
      hint: `${summary.occupiedNights} noches ocupadas`,
      icon: CalendarDays,
    },
    {
      label: "Ingresos totales",
      value: formatCurrency(summary.totalRevenue),
      hint: "del período filtrado",
      icon: Coins,
    },
    {
      label: "Cobrado",
      value: formatCurrency(summary.paid),
      hint:
        summary.pending > 0
          ? `Pendiente ${formatCurrency(summary.pending)}`
          : "Todo cobrado",
      hintTone: summary.pending > 0 ? "warning" : "success",
      icon: Wallet,
    },
    {
      label: "Ocupación",
      value: formatPercent(occupancy, 1),
      hint:
        summary.availableNights > 0
          ? `${summary.occupiedNights} de ${summary.availableNights} noches`
          : "Sin propiedades activas",
      icon: Percent,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const tone =
          "hintTone" in item && item.hintTone === "warning"
            ? "text-warning"
            : "hintTone" in item && item.hintTone === "success"
              ? "text-success"
              : "text-muted-foreground";
        return (
          <Card key={item.label}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="numeric text-2xl font-semibold leading-tight">
                  {item.value}
                </p>
                <p className={`text-xs ${tone}`}>{item.hint}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
