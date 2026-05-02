"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  endOfDay,
  format,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatPercent, type Currency } from "@/lib/format";
import {
  sumRevenue,
  sumExpenses,
  outstandingBalance,
  occupancyRate,
  adr,
  revPar,
  monthlyRevenueByProperty,
  monthlyOccupancyByProperty,
  revenueByPropertyYTD,
  topGuests,
  revenueBySource,
  dailyOccupancy,
} from "@/lib/analytics";
import { RevenueLineChart } from "@/components/charts/revenue-line";
import { OccupancyBarChart } from "@/components/charts/occupancy-bar";
import { RevenueDonut } from "@/components/charts/revenue-donut";
import { TopGuestsBar } from "@/components/charts/top-guests-bar";
import { SourceBar } from "@/components/charts/source-bar";
import { OccupancyHeatmap } from "@/components/charts/occupancy-heatmap";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  BedDouble,
} from "lucide-react";
import type { ExchangeRate, Property } from "@/types/supabase";
import type { LucideIcon } from "lucide-react";

type Reservation = {
  property_id: string;
  check_in: string;
  check_out: string;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: string;
  status: string;
  nights: number;
  guest_id: string | null;
};

type Expense = {
  property_id: string | null;
  date: string;
  amount_ars: number;
  category: string;
};

type Preset = "thisMonth" | "lastMonth" | "ytd" | "last12";

/* ── helpers ── */

function buildLast12Months(): { value: string; label: string; date: Date }[] {
  const months: { value: string; label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: es }),
      date: d,
    });
  }
  return months;
}

/* ── component ── */

export function DashboardClient({
  reservations,
  properties,
  expenses,
  guests,
  rate,
}: {
  reservations: Reservation[];
  properties: Property[];
  expenses: Expense[];
  guests: { id: string; name: string }[];
  rate: ExchangeRate;
}) {
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [preset, setPreset] = useState<Preset | null>("thisMonth");
  const [customMonth, setCustomMonth] = useState<string | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<string>>(
    () => new Set(properties.map((p) => p.id))
  );

  const last12Months = useMemo(() => buildLast12Months(), []);

  const range = useMemo(() => {
    if (customMonth) {
      const d = parseISO(customMonth + "-01");
      return { from: startOfMonth(d), to: endOfDay(endOfMonth(d)) };
    }
    const now = new Date();
    if (preset === "thisMonth") return { from: startOfMonth(now), to: endOfDay(endOfMonth(now)) };
    if (preset === "lastMonth") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfDay(endOfMonth(lm)) };
    }
    if (preset === "ytd") return { from: startOfYear(now), to: endOfDay(now) };
    return { from: subMonths(now, 12), to: endOfDay(now) };
  }, [preset, customMonth]);

  function handlePreset(p: Preset) {
    setPreset(p);
    setCustomMonth(null);
  }

  function handleMonthSelect(value: string) {
    setCustomMonth(value);
    setPreset(null);
  }

  const filteredProps = properties.filter((p) => selectedProps.has(p.id));
  const filteredRes = reservations.filter((r) => selectedProps.has(r.property_id));
  const filteredExp = expenses.filter(
    (e) => !e.property_id || selectedProps.has(e.property_id)
  );

  const now = new Date();
  const thisMonth = { from: startOfMonth(now), to: endOfDay(endOfMonth(now)) };
  const prevMonth = {
    from: startOfMonth(subMonths(now, 1)),
    to: endOfDay(endOfMonth(subMonths(now, 1))),
  };

  const revenueRange = sumRevenue(filteredRes, range.from, range.to);
  const revenueThisMonth = sumRevenue(filteredRes, thisMonth.from, thisMonth.to);
  const revenuePrevMonth = sumRevenue(filteredRes, prevMonth.from, prevMonth.to);
  const revenueYTD = sumRevenue(filteredRes, startOfYear(now), endOfDay(now));
  const occRange = occupancyRate(filteredRes, filteredProps, range.from, range.to);
  const adrRange = adr(filteredRes, range.from, range.to);
  const revparRange = revPar(filteredRes, filteredProps, range.from, range.to);
  const balance = outstandingBalance(filteredRes);
  const expenseRange = sumExpenses(filteredExp, range.from, range.to);
  const netProfit = revenueRange - expenseRange;
  const monthDelta =
    revenuePrevMonth > 0
      ? (revenueThisMonth - revenuePrevMonth) / revenuePrevMonth
      : null;

  const monthlyRevenue = useMemo(
    () => monthlyRevenueByProperty(filteredRes, filteredProps, 12),
    [filteredRes, filteredProps]
  );
  const monthlyOcc = useMemo(
    () => monthlyOccupancyByProperty(filteredRes, filteredProps, 12),
    [filteredRes, filteredProps]
  );
  const ytdByProperty = useMemo(
    () => revenueByPropertyYTD(filteredRes, filteredProps),
    [filteredRes, filteredProps]
  );
  const top = useMemo(() => topGuests(filteredRes, guests, 10), [filteredRes, guests]);
  const bySource = useMemo(() => revenueBySource(filteredRes), [filteredRes]);
  const heatmap = useMemo(
    () => dailyOccupancy(filteredRes, filteredProps),
    [filteredRes, filteredProps]
  );

  function fmt(n: number) {
    return formatCurrency(n, currency, rate);
  }

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ── */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["thisMonth", "Este mes"],
                ["lastMonth", "Mes anterior"],
                ["ytd", "YTD"],
                ["last12", "Últ. 12 meses"],
              ] as [Preset, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => handlePreset(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  preset === k
                    ? "bg-secondary text-foreground font-medium border-border"
                    : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}

            <Select
              value={customMonth ?? ""}
              onValueChange={handleMonthSelect}
            >
              <SelectTrigger
                className={cn(
                  "h-7 w-[160px] rounded-full border text-xs",
                  customMonth
                    ? "bg-secondary text-foreground font-medium border-border"
                    : "border-border text-muted-foreground"
                )}
              >
                <SelectValue placeholder="Elegir mes" />
              </SelectTrigger>
              <SelectContent>
                {last12Months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {properties.map((p) => {
                const active = selectedProps.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedProps);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setSelectedProps(next);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                      active ? "border-foreground/40" : "border-border opacity-50"
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color_hex ?? "#A47148" }}
                    />
                    {p.name}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1 rounded-md border border-border p-0.5">
              {(["ARS", "USD", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-sm transition-colors",
                    currency === c
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PrimaryKpi
          icon={DollarSign}
          label="Ingresos del mes"
          value={fmt(revenueThisMonth)}
          delta={monthDelta}
        />
        <PrimaryKpi
          icon={TrendingUp}
          label="Ingresos YTD"
          value={fmt(revenueYTD)}
        />
        <PrimaryKpi
          icon={BarChart3}
          label="Ocupación promedio"
          value={formatPercent(occRange)}
        />
        <PrimaryKpi
          icon={BedDouble}
          label="ADR (precio/noche)"
          value={fmt(adrRange)}
        />
      </div>

      {/* ── Secondary KPIs ── */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Métricas secundarias
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SecondaryKpi label="RevPAR" value={fmt(revparRange)} />
          <SecondaryKpi label="Saldo pendiente" value={fmt(balance)} />
          <SecondaryKpi label="Gastos del rango" value={fmt(expenseRange)} />
          <SecondaryKpi
            label="Beneficio neto"
            value={fmt(netProfit)}
            accent={netProfit >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos mensuales · últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart
              data={monthlyRevenue}
              properties={filteredProps}
              currency={currency}
              rate={rate}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ocupación mensual por propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyBarChart data={monthlyOcc} properties={filteredProps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por propiedad (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueDonut data={ytdByProperty} currency={currency} rate={rate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 huéspedes</CardTitle>
          </CardHeader>
          <CardContent>
            <TopGuestsBar data={top} currency={currency} rate={rate} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingresos por canal</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceBar data={bySource} currency={currency} rate={rate} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ocupación diaria · {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyHeatmap data={heatmap} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── KPI Components ── */

function PrimaryKpi({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
        </div>
        <p className="numeric mt-2 text-2xl font-semibold">{value}</p>
        {delta !== undefined && delta !== null && (
          <p
            className={cn(
              "mt-1 text-xs",
              delta >= 0 ? "text-emerald-500" : "text-destructive"
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(delta))} vs mes
            anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SecondaryKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p
          className={cn(
            "numeric mt-1.5 text-lg font-semibold",
            accent === "positive" && "text-emerald-500",
            accent === "negative" && "text-destructive"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
