"use client";

import { useMemo } from "react";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-media-query";
import {
  type DashboardFiltersControls,
  type FilterCurrency,
  type RangePreset,
  togglePropIdAgainstUniverse,
} from "./use-dashboard-filters";
import type { Property } from "@/types/supabase";

const PRESETS: ReadonlyArray<[RangePreset, string]> = [
  ["thisMonth", "Este mes"],
  ["lastMonth", "Mes anterior"],
  ["ytd", "YTD"],
  ["last12", "Últ. 12 meses"],
];

const CURRENCIES: ReadonlyArray<FilterCurrency> = ["ARS", "USD", "EUR"];

function buildLast12Months(): { value: string; label: string }[] {
  const now = new Date();
  const months: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: es }),
    });
  }
  return months;
}

export function FilterBar({
  filters,
  properties,
}: {
  filters: DashboardFiltersControls;
  properties: Property[];
}) {
  const isMobile = useIsMobile();
  const last12Months = useMemo(() => buildLast12Months(), []);
  const selectedSet = useMemo(() => {
    if (filters.propIds.length === 0) return new Set(properties.map((p) => p.id));
    return new Set(filters.propIds);
  }, [filters.propIds, properties]);
  const activeCount = selectedSet.size;
  const allActive = activeCount === properties.length;

  const propertyToggles = (
    <>
      {properties.map((p) => {
        const active = selectedSet.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              filters.setPropIds(
                togglePropIdAgainstUniverse(p.id, filters.propIds, properties)
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-foreground/40"
                : "border-border opacity-50 hover:opacity-80"
            )}
            aria-pressed={active}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color_hex ?? "var(--chart-1)" }}
              aria-hidden
            />
            {p.name}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/85 backdrop-blur-sm border-b border-border">
      <div className="flex flex-wrap items-center gap-3">
        {/* Time scope: presets + month picker */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(([k, label]) => {
            const active = !filters.month && filters.range === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => filters.setRange(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-secondary text-foreground font-medium border-border"
                    : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}

          <Select
            value={filters.month ?? ""}
            onValueChange={(v) => filters.setMonth(v)}
          >
            <SelectTrigger
              className={cn(
                "h-7 w-[170px] rounded-full border text-xs",
                filters.month
                  ? "bg-secondary text-foreground font-medium border-border"
                  : "border-border text-muted-foreground"
              )}
            >
              <SelectValue placeholder="Elegir mes" />
            </SelectTrigger>
            <SelectContent>
              {last12Months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="capitalize">{m.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Property toggles — inline on tablet+, collapsed in popover on mobile */}
          {isMobile ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Propiedades · {allActive ? "todas" : `${activeCount} activa${activeCount === 1 ? "" : "s"}`}
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Propiedades</p>
                <div className="flex flex-wrap gap-1.5">{propertyToggles}</div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex flex-wrap gap-1">{propertyToggles}</div>
          )}

          {/* Currency switcher */}
          <div
            className="flex gap-1 rounded-md border border-border p-0.5"
            role="group"
            aria-label="Moneda"
          >
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => filters.setCurrency(c)}
                className={cn(
                  "px-2 py-0.5 text-xs rounded-sm transition-colors tabular-nums",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  filters.currency === c
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={filters.currency === c}
              >
                {c}
              </button>
            ))}
          </div>

          <ResetFiltersButton
            onClick={filters.reset}
            disabled={filters.isDefault}
            label="Restablecer"
          />
        </div>
      </div>
    </div>
  );
}
