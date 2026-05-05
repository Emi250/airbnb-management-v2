"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type RangePreset = "thisMonth" | "lastMonth" | "ytd" | "last12";
export type FilterCurrency = "ARS" | "USD" | "EUR";

const RANGE_PRESETS: ReadonlyArray<RangePreset> = ["thisMonth", "lastMonth", "ytd", "last12"];
const CURRENCIES: ReadonlyArray<FilterCurrency> = ["ARS", "USD", "EUR"];

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

const DEFAULTS = {
  range: "thisMonth" as RangePreset,
  month: null as string | null,
  propIds: [] as string[],
  currency: "ARS" as FilterCurrency,
};

export type DashboardFilters = {
  range: RangePreset;
  month: string | null;
  propIds: string[];
  currency: FilterCurrency;
};

export function parseDashboardFilters(searchParams: URLSearchParams | { get(key: string): string | null }): DashboardFilters {
  const rangeRaw = searchParams.get("range");
  const range = (RANGE_PRESETS as ReadonlyArray<string>).includes(rangeRaw ?? "")
    ? (rangeRaw as RangePreset)
    : DEFAULTS.range;

  const monthRaw = searchParams.get("month");
  const month = monthRaw && MONTH_PATTERN.test(monthRaw) ? monthRaw : DEFAULTS.month;

  const propsRaw = searchParams.get("props");
  const propIds = propsRaw
    ? Array.from(new Set(propsRaw.split(",").filter((id) => UUID_PATTERN.test(id)))).sort()
    : DEFAULTS.propIds;

  const curRaw = searchParams.get("cur");
  const currency = (CURRENCIES as ReadonlyArray<string>).includes(curRaw ?? "")
    ? (curRaw as FilterCurrency)
    : DEFAULTS.currency;

  return { range, month, propIds, currency };
}

export type DashboardFiltersControls = DashboardFilters & {
  setRange: (range: RangePreset) => void;
  setMonth: (month: string | null) => void;
  setPropIds: (ids: string[]) => void;
  setCurrency: (currency: FilterCurrency) => void;
  reset: () => void;
  isDefault: boolean;
};

export function useDashboardFilters(): DashboardFiltersControls {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseDashboardFilters(searchParams), [searchParams]);

  const writeParams = useCallback(
    (next: Partial<DashboardFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();

      if (merged.month) {
        params.set("month", merged.month);
      } else if (merged.range !== DEFAULTS.range) {
        params.set("range", merged.range);
      }
      if (merged.propIds.length > 0) {
        const sorted = Array.from(new Set(merged.propIds)).sort();
        params.set("props", sorted.join(","));
      }
      if (merged.currency !== DEFAULTS.currency) {
        params.set("cur", merged.currency);
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router]
  );

  const setRange = useCallback(
    (range: RangePreset) => writeParams({ range, month: null }),
    [writeParams]
  );

  const setMonth = useCallback(
    (month: string | null) => writeParams({ month, range: month ? filters.range : "thisMonth" }),
    [writeParams, filters.range]
  );

  const setPropIds = useCallback(
    (ids: string[]) => writeParams({ propIds: ids }),
    [writeParams]
  );

  const setCurrency = useCallback(
    (currency: FilterCurrency) => writeParams({ currency }),
    [writeParams]
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const isDefault =
    filters.range === DEFAULTS.range &&
    filters.month === DEFAULTS.month &&
    filters.propIds.length === 0 &&
    filters.currency === DEFAULTS.currency;

  return {
    ...filters,
    setRange,
    setMonth,
    setPropIds,
    setCurrency,
    reset,
    isDefault,
  };
}

/**
 * Resolve `propIds` into the effective set of selected property ids,
 * given the universe of properties. Empty `propIds` means "all selected".
 */
export function resolvePropIds(propIds: string[], universe: { id: string }[]): Set<string> {
  if (propIds.length === 0) return new Set(universe.map((p) => p.id));
  const universeSet = new Set(universe.map((p) => p.id));
  return new Set(propIds.filter((id) => universeSet.has(id)));
}

/**
 * Toggle a property id against the current selection, accounting for the
 * "empty == all selected" sentinel. Returns the new ids array to pass to setPropIds.
 */
export function togglePropIdAgainstUniverse(
  id: string,
  propIds: string[],
  universe: { id: string }[]
): string[] {
  const all = universe.map((p) => p.id);
  const effective = propIds.length === 0 ? new Set(all) : new Set(propIds);
  if (effective.has(id)) effective.delete(id);
  else effective.add(id);
  if (effective.size === all.length) return [];
  return Array.from(effective).sort();
}
