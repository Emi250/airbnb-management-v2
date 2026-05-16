"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  endOfDay,
  parseISO,
} from "date-fns";
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
} from "@/lib/analytics";
import {
  aggregateOccupancyTargetForRange,
  aggregateRevenueTargetsForRange,
  compareToTarget,
  monthKey as toMonthKey,
  monthKeysInRange,
  paceFractionForRange,
} from "@/lib/analytics-targets";
import { useDashboardFilters } from "./use-dashboard-filters";
import { FilterBar } from "./filter-bar";
import { PulsoSection } from "./pulso-section";
import { DetallesSection } from "./detalles-section";
import { AnalisisSection } from "./analisis-section";
import type { ExchangeRate, MonthlyTarget, Property } from "@/types/supabase";

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

export function DashboardClient({
  reservations,
  properties,
  expenses,
  targets,
  rate,
}: {
  reservations: Reservation[];
  properties: Property[];
  expenses: Expense[];
  targets: MonthlyTarget[];
  rate: ExchangeRate;
}) {
  const filters = useDashboardFilters();

  const selectedProps = useMemo(() => {
    if (filters.propIds.length === 0) return new Set(properties.map((p) => p.id));
    const universe = new Set(properties.map((p) => p.id));
    return new Set(filters.propIds.filter((id) => universe.has(id)));
  }, [filters.propIds, properties]);

  // Resolved time range from filter state.
  // anchorMonth = the month the popover edits (for monthly scopes it's the scope itself; for
  // YTD / Últ. 12 it's the most recent month within scope, per IA Flow 3).
  const { range, anchorMonth } = useMemo(() => {
    const now = new Date();
    if (filters.month) {
      const d = parseISO(filters.month + "-01");
      return {
        range: { from: startOfMonth(d), to: endOfDay(endOfMonth(d)) },
        anchorMonth: startOfMonth(d),
      };
    }
    switch (filters.range) {
      case "thisMonth":
        return {
          range: { from: startOfMonth(now), to: endOfDay(endOfMonth(now)) },
          anchorMonth: startOfMonth(now),
        };
      case "lastMonth": {
        const lm = subMonths(now, 1);
        return {
          range: { from: startOfMonth(lm), to: endOfDay(endOfMonth(lm)) },
          anchorMonth: startOfMonth(lm),
        };
      }
      case "ytd":
        return {
          range: { from: startOfYear(now), to: endOfDay(now) },
          anchorMonth: startOfMonth(now),
        };
      case "last12":
        return {
          range: { from: subMonths(now, 12), to: endOfDay(now) },
          anchorMonth: startOfMonth(now),
        };
    }
  }, [filters.month, filters.range]);

  // Previous month range — used for MoM delta. Always relative to anchorMonth.
  const prevRange = useMemo(() => {
    const prev = subMonths(anchorMonth, 1);
    return { from: startOfMonth(prev), to: endOfDay(endOfMonth(prev)) };
  }, [anchorMonth]);

  // The "month being targeted" — first-of-month yyyy-MM-01.
  const monthKeyStr = useMemo(() => toMonthKey(anchorMonth), [anchorMonth]);

  // Apply property filter to data.
  const filteredProps = useMemo(
    () => properties.filter((p) => selectedProps.has(p.id)),
    [properties, selectedProps]
  );
  const filteredRes = useMemo(
    () => reservations.filter((r) => selectedProps.has(r.property_id)),
    [reservations, selectedProps]
  );
  const filteredExp = useMemo(
    () => expenses.filter((e) => !e.property_id || selectedProps.has(e.property_id)),
    [expenses, selectedProps]
  );

  // Active-property ids for the target editor (universe of editable properties = those in filter scope).
  const activePropertyIds = useMemo(
    () => filteredProps.map((p) => p.id),
    [filteredProps]
  );

  // Month keys covered by the active range — used to sum/average targets across multi-month scopes.
  const scopeMonthKeys = useMemo(
    () => monthKeysInRange(range.from, range.to),
    [range.from, range.to]
  );

  // Aggregate revenue target for the active scope (sum across all months in range).
  // Used by the KPI vs-target compare.
  const aggregateRevenueTarget = useMemo(
    () => aggregateRevenueTargetsForRange(targets, activePropertyIds, scopeMonthKeys),
    [targets, activePropertyIds, scopeMonthKeys]
  );

  // Per-month revenue target for the anchor month — used as the horizontal reference line
  // on the hero chart so the line is the benchmark each monthly bar should hit, not the
  // range total.
  const anchorMonthRevenueTarget = useMemo(
    () => aggregateRevenueTargetsForRange(targets, activePropertyIds, [monthKeyStr]),
    [targets, activePropertyIds, monthKeyStr]
  );

  // Aggregate occupancy target — average across all property×month rows that have one set.
  const aggregateOccupancyTarget = useMemo(
    () => aggregateOccupancyTargetForRange(targets, activePropertyIds, scopeMonthKeys),
    [targets, activePropertyIds, scopeMonthKeys]
  );

  // Pace fraction for the entire active range (day-granular elapsed/total).
  // Handles partial current month inside YTD/Last-12 correctly.
  const paceFraction = useMemo(
    () => paceFractionForRange(new Date(), range.from, range.to),
    [range.from, range.to]
  );

  // True when the active filter scope has zero applicable reservations.
  const isEmptyScope = useMemo(() => {
    if (filteredProps.length === 0) return true;
    const t0 = range.from.getTime();
    const t1 = range.to.getTime();
    return !filteredRes.some((r) => {
      const ci = parseISO(r.check_in).getTime();
      return ci >= t0 && ci <= t1;
    });
  }, [filteredRes, filteredProps, range]);

  // Core KPI values for the active range.
  const kpiNumbers = useMemo(() => {
    const revenueRange = sumRevenue(filteredRes, range.from, range.to);
    const expenseRange = sumExpenses(filteredExp, range.from, range.to);
    const occRange = occupancyRate(filteredRes, filteredProps, range.from, range.to);
    const adrRange = adr(filteredRes, range.from, range.to);
    const revparRange = revPar(filteredRes, filteredProps, range.from, range.to);
    const balance = outstandingBalance(filteredRes);
    const netProfit = revenueRange - expenseRange;

    const ytdFrom = startOfYear(new Date());
    const ytdTo = endOfDay(new Date());
    const revenueYTD = sumRevenue(filteredRes, ytdFrom, ytdTo);

    // MoM deltas — relative to the previous month from anchor.
    const revenuePrev = sumRevenue(filteredRes, prevRange.from, prevRange.to);
    const occPrev = occupancyRate(filteredRes, filteredProps, prevRange.from, prevRange.to);
    const expensePrev = sumExpenses(filteredExp, prevRange.from, prevRange.to);
    const profitPrev = revenuePrev - expensePrev;

    const revenueMom = revenuePrev > 0 ? (revenueRange - revenuePrev) / revenuePrev : null;
    const profitMom = profitPrev !== 0 ? (netProfit - profitPrev) / Math.abs(profitPrev) : null;
    const occMom = occPrev > 0 ? (occRange - occPrev) / occPrev : null;

    return {
      revenueRange,
      expenseRange,
      occRange,
      adrRange,
      revparRange,
      balance,
      netProfit,
      revenueYTD,
      revenueMom,
      profitMom,
      occMom,
    };
  }, [filteredRes, filteredExp, filteredProps, range, prevRange]);

  // Compare-to-target results.
  // Revenue is summed across the scope's months. Occupancy is averaged across rows that have
  // a target_occupancy set. Beneficio neto intentionally has no target — it's derived from
  // revenue minus expenses, so a separate net-profit target would duplicate signal.
  const revenueCompare = useMemo(
    () =>
      compareToTarget({
        actual: kpiNumbers.revenueRange,
        target: aggregateRevenueTarget,
        paceFraction,
      }),
    [kpiNumbers.revenueRange, aggregateRevenueTarget, paceFraction]
  );

  const occupancyCompare = useMemo(
    () =>
      compareToTarget({
        actual: kpiNumbers.occRange,
        target: aggregateOccupancyTarget,
        // Occupancy is a rate already normalized over the period — no pace adjustment.
        paceFraction: 1,
      }),
    [kpiNumbers.occRange, aggregateOccupancyTarget]
  );

  // 12-month revenue chart data — independent of time range.
  const monthlyRevenue = useMemo(
    () => monthlyRevenueByProperty(filteredRes, filteredProps, 12),
    [filteredRes, filteredProps]
  );

  // Occupancy bar data — same 12-month window.
  const monthlyOcc = useMemo(
    () => monthlyOccupancyByProperty(filteredRes, filteredProps, 12),
    [filteredRes, filteredProps]
  );

  // Datos por departamento para la lista de "Análisis por departamento":
  // ingresos YTD (de revenueByPropertyYTD) + ocupación YTD (occupancyRate por
  // propiedad sobre la misma ventana inicio-de-año → hoy). Composición de
  // funciones ya existentes; no se agrega lógica a lib/analytics.ts.
  const departmentBreakdown = useMemo(() => {
    const ytdFrom = startOfYear(new Date());
    const ytdTo = endOfDay(new Date());
    const revenueRows = revenueByPropertyYTD(filteredRes, filteredProps);
    return filteredProps.map((p) => {
      const revRow = revenueRows.find((r) => r.name === p.name);
      return {
        id: p.id,
        name: p.name,
        color: p.color_hex ?? "#A47148",
        revenueYtd: revRow?.value ?? 0,
        occupancy: occupancyRate(
          filteredRes.filter((r) => r.property_id === p.id),
          [p],
          ytdFrom,
          ytdTo
        ),
      };
    });
  }, [filteredRes, filteredProps]);

  return (
    <div className="space-y-8 pb-12">
      <FilterBar filters={filters} properties={properties} />

      <PulsoSection
        empty={isEmptyScope}
        kpis={{
          revenue: {
            value: kpiNumbers.revenueRange,
            compare: revenueCompare,
            momDelta: kpiNumbers.revenueMom,
          },
          netProfit: {
            value: kpiNumbers.netProfit,
            compare: null,
            momDelta: kpiNumbers.profitMom,
          },
          occupancy: {
            value: kpiNumbers.occRange,
            compare: occupancyCompare,
            momDelta: kpiNumbers.occMom,
          },
          balance: {
            value: kpiNumbers.balance,
            compare: null,
            momDelta: null,
          },
        }}
        chart={{
          data: monthlyRevenue,
          properties: filteredProps,
          target: anchorMonthRevenueTarget,
        }}
        targetEditor={{
          properties: filteredProps,
          targets,
          monthKey: monthKeyStr,
        }}
        currency={filters.currency}
        rate={rate}
      />

      <DetallesSection
        empty={isEmptyScope}
        values={{
          revenueYTD: kpiNumbers.revenueYTD,
          expensesRange: kpiNumbers.expenseRange,
          revPar: kpiNumbers.revparRange,
          adr: kpiNumbers.adrRange,
        }}
        currency={filters.currency}
        rate={rate}
      />

      <AnalisisSection
        occupancy={{
          data: monthlyOcc,
          properties: filteredProps,
        }}
        breakdown={departmentBreakdown}
        currency={filters.currency}
        rate={rate}
      />
    </div>
  );
}
