"use client";

import { SectionHeading } from "@/components/dashboard/section-heading";
import { SecondaryKpi } from "@/components/dashboard/secondary-kpi";
import { formatCurrency, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";

export type DetallesSectionProps = {
  /** When true, the active filter scope yields no reservations. Values render as "—". */
  empty?: boolean;
  values: {
    revenueYTD: number;
    expensesRange: number;
    revPar: number;
    adr: number;
  };
  currency: Currency;
  rate: ExchangeRate;
};

export function DetallesSection({
  empty = false,
  values,
  currency,
  rate,
}: DetallesSectionProps) {
  function fmt(n: number) {
    return empty ? "—" : formatCurrency(n, currency, rate);
  }

  return (
    <section className="space-y-4">
      <SectionHeading title="Detalles del mes" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SecondaryKpi label="Ingresos YTD" value={fmt(values.revenueYTD)} />
        <SecondaryKpi label="Gastos del rango" value={fmt(values.expensesRange)} />
        <SecondaryKpi label="RevPAR" value={fmt(values.revPar)} />
        <SecondaryKpi label="ADR" value={fmt(values.adr)} />
      </div>
    </section>
  );
}
