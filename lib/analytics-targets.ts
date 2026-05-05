import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  startOfMonth,
} from "date-fns";
import type { MonthlyTarget } from "@/types/supabase";

export type TargetStatus = "on_track" | "below" | "no_target";

export type CompareToTargetResult = {
  actual: number;
  target: number | null;
  paceTarget: number | null;
  pct: number | null;
  status: TargetStatus;
};

const DEFAULT_THRESHOLD = 0.95;

/**
 * Compares an actual value to a (possibly pace-adjusted) target.
 * paceFraction is 0..1; for a fully-elapsed period pass 1, for a partial month pass days-elapsed / days-in-month.
 * Caller decides the threshold (default 0.95 = the IA's "En objetivo" cutoff).
 */
export function compareToTarget({
  actual,
  target,
  paceFraction = 1,
  threshold = DEFAULT_THRESHOLD,
}: {
  actual: number;
  target: number | null;
  paceFraction?: number;
  threshold?: number;
}): CompareToTargetResult {
  if (target == null || target <= 0) {
    return { actual, target, paceTarget: null, pct: null, status: "no_target" };
  }
  const paceTarget = target * paceFraction;
  if (paceTarget <= 0) {
    return { actual, target, paceTarget: 0, pct: null, status: "on_track" };
  }
  const pct = actual / paceTarget;
  return {
    actual,
    target,
    paceTarget,
    pct,
    status: pct >= threshold ? "on_track" : "below",
  };
}

/**
 * Sum of monthly_targets revenue for the given property scope and month list.
 * propertyIds null/empty = all properties.
 * monthKeys = list of yyyy-MM-01 keys to include. Pass [singleMonth] for monthly scope,
 * or all months in range for YTD / Last-12 scopes.
 * Returns null if no matching rows exist (so callers can render "Sin objetivo").
 */
export function aggregateRevenueTargetsForRange(
  targets: MonthlyTarget[],
  propertyIds: string[] | null,
  monthKeys: string[]
): number | null {
  if (monthKeys.length === 0) return null;
  const scope = propertyIds && propertyIds.length > 0 ? new Set(propertyIds) : null;
  const monthSet = new Set(monthKeys);
  const rows = targets.filter(
    (t) => monthSet.has(t.month) && (scope === null || scope.has(t.property_id))
  );
  if (rows.length === 0) return null;
  return rows.reduce((acc, r) => acc + Number(r.target_revenue_ars), 0);
}

/**
 * Single-month convenience wrapper. Equivalent to the previous `aggregateTargetsForScope`.
 */
export function aggregateTargetsForScope(
  targets: MonthlyTarget[],
  propertyIds: string[] | null,
  month: string
): number | null {
  return aggregateRevenueTargetsForRange(targets, propertyIds, [month]);
}

/**
 * Average occupancy target across the given property scope and month list.
 * Occupancy is a percentage (0..100); aggregating across properties + months
 * is a simple mean weighted by property×month rows that have a target set.
 *
 * propertyIds null/empty = all properties.
 * Returns null if no matching rows have target_occupancy set.
 *
 * Note: a strict capacity-weighted average would require knowing each property's
 * available nights per month. For equal-sized property portfolios this simple mean
 * is a close approximation; revisit if portfolios become heterogeneous.
 */
export function aggregateOccupancyTargetForRange(
  targets: MonthlyTarget[],
  propertyIds: string[] | null,
  monthKeys: string[]
): number | null {
  if (monthKeys.length === 0) return null;
  const scope = propertyIds && propertyIds.length > 0 ? new Set(propertyIds) : null;
  const monthSet = new Set(monthKeys);
  const rows = targets.filter(
    (t) =>
      monthSet.has(t.month) &&
      (scope === null || scope.has(t.property_id)) &&
      t.target_occupancy !== null &&
      t.target_occupancy !== undefined
  );
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, r) => acc + Number(r.target_occupancy), 0);
  return sum / rows.length / 100; // returns 0..1 to match occupancyRate output
}

/**
 * Enumerate yyyy-MM-01 keys for every month touched by the given range.
 * Both endpoints inclusive at month granularity.
 */
export function monthKeysInRange(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  // Safety cap so a misconfigured range can't loop unbounded.
  for (let i = 0; i < 60 && cursor <= end; i++) {
    keys.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

/**
 * Pace fraction for "this month" partial scope: how much of the month has elapsed.
 * For a fully-past month, returns 1. For a future month, returns 0.
 */
export function paceFractionForMonth(now: Date, monthDate: Date): number {
  return paceFractionForRange(now, startOfMonth(monthDate), endOfMonth(monthDate));
}

/**
 * Pace fraction for an arbitrary range. Day-granular elapsed / total days.
 * For a past range (now >= to), returns 1. For a future range, returns 0.
 */
export function paceFractionForRange(now: Date, from: Date, to: Date): number {
  if (now >= to) return 1;
  if (now < from) return 0;
  const elapsed = differenceInCalendarDays(now, from) + 1;
  const total = differenceInCalendarDays(to, from) + 1;
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, elapsed / total));
}

/** Format a Date or yyyy-MM-DD string into a yyyy-MM-01 first-of-month key. */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
