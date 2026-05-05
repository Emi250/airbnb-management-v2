"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { HeroKpi, EditTargetTrigger } from "@/components/dashboard/hero-kpi";
import { KpiTargetPopover } from "@/components/dashboard/kpi-target-popover";
import { RevenueLineChart } from "@/components/charts/revenue-line";
import { formatCurrency, formatPercent, type Currency } from "@/lib/format";
import type { CompareToTargetResult } from "@/lib/analytics-targets";
import type { ExchangeRate, MonthlyTarget, Property } from "@/types/supabase";

export type PulsoKpiData = {
  /** Raw value in ARS (or, for occupancy, 0..1). */
  value: number;
  /** May be null when this KPI doesn't track a target. */
  compare: CompareToTargetResult | null;
  /** MoM delta as a fraction, e.g. 0.12 for +12%. Null when not enough history. */
  momDelta: number | null;
};

export type PulsoSectionProps = {
  /** When true, the active filter scope yields no reservations. KPIs render as "—". */
  empty?: boolean;
  kpis: {
    revenue: PulsoKpiData;
    netProfit: PulsoKpiData;
    occupancy: PulsoKpiData;
    balance: PulsoKpiData;
  };
  chart: {
    data: Array<Record<string, string | number>>;
    properties: Property[];
    target: number | null;
  };
  targetEditor: {
    properties: Pick<Property, "id" | "name">[];
    targets: MonthlyTarget[];
    monthKey: string;
  };
  currency: Currency;
  rate: ExchangeRate;
};

function fmtMoney(value: number, currency: Currency, rate: ExchangeRate): string {
  return formatCurrency(value, currency, rate);
}

function fmtMomDelta(delta: number | null): {
  text: string | null;
  direction: "positive" | "negative" | "neutral";
} {
  if (delta === null) return { text: null, direction: "neutral" };
  if (delta === 0) return { text: "0,0%", direction: "neutral" };
  const abs = Math.abs(delta);
  const sign = delta > 0 ? "+" : "−";
  return {
    text: `${sign}${formatPercent(abs)}`,
    direction: delta > 0 ? "positive" : "negative",
  };
}

function fmtVsTarget(compare: CompareToTargetResult | null): string | null {
  if (!compare || compare.status === "no_target" || compare.pct === null) return null;
  const pct = compare.pct;
  if (!Number.isFinite(pct)) return null;
  const display = formatPercent(pct);
  return `${display} del objetivo${compare.paceTarget !== compare.target ? " (ritmo)" : ""}`;
}

export function PulsoSection({
  empty = false,
  kpis,
  chart,
  targetEditor,
  currency,
  rate,
}: PulsoSectionProps) {
  // Single popover edits both revenue and occupancy targets for the active scope.
  // Each KPI that tracks a target gets its own trigger that opens the same popover.
  const renderEditTrigger = () =>
    targetEditor.properties.length > 0 ? (
      <KpiTargetPopover
        properties={targetEditor.properties}
        targets={targetEditor.targets}
        monthKey={targetEditor.monthKey}
      >
        <EditTargetTrigger />
      </KpiTargetPopover>
    ) : null;

  const revenueMom = fmtMomDelta(kpis.revenue.momDelta);
  const profitMom = fmtMomDelta(kpis.netProfit.momDelta);
  const occMom = fmtMomDelta(kpis.occupancy.momDelta);

  return (
    <section className="space-y-5">
      <SectionHeading title="Pulso del mes" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpi
          label="Ingresos del mes"
          value={empty ? null : fmtMoney(kpis.revenue.value, currency, rate)}
          status={empty ? null : kpis.revenue.compare?.status ?? "no_target"}
          vsTarget={empty ? null : fmtVsTarget(kpis.revenue.compare)}
          momDelta={empty ? null : revenueMom.text}
          momDirection={revenueMom.direction}
          editTarget={renderEditTrigger()}
        />
        <HeroKpi
          label="Beneficio neto"
          value={empty ? null : fmtMoney(kpis.netProfit.value, currency, rate)}
          status={null}
          momDelta={empty ? null : profitMom.text}
          momDirection={profitMom.direction}
        />
        <HeroKpi
          label="Ocupación promedio"
          value={empty ? null : formatPercent(kpis.occupancy.value)}
          status={empty ? null : kpis.occupancy.compare?.status ?? "no_target"}
          vsTarget={empty ? null : fmtVsTarget(kpis.occupancy.compare)}
          momDelta={empty ? null : occMom.text}
          momDirection={occMom.direction}
          editTarget={renderEditTrigger()}
        />
        <HeroKpi
          label="Saldo pendiente"
          value={empty ? null : fmtMoney(kpis.balance.value, currency, rate)}
          status={null}
          momDelta={null}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Ingresos · últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueLineChart
            data={chart.data}
            properties={chart.properties}
            currency={currency}
            rate={rate}
            target={chart.target}
          />
        </CardContent>
      </Card>
    </section>
  );
}
