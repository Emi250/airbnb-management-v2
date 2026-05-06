"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/supabase";
import {
  defaultRange,
  presetRange,
  type DateRange,
  type PresetKey,
} from "./reports-utils";

export type ReportsFiltersState = {
  from: string;
  to: string;
  propertyIds: string[];
};

export const PRESET_LABELS: Record<PresetKey, string> = {
  thisMonth: "Este mes",
  lastMonth: "Mes pasado",
  thisYear: "Este año",
  lastYear: "Año pasado",
};

export function ReportsFilters({
  properties,
  value,
  onChange,
}: {
  properties: Property[];
  value: ReportsFiltersState;
  onChange: (next: ReportsFiltersState) => void;
}) {
  const def = defaultRange();
  const isDefault =
    value.from === def.from &&
    value.to === def.to &&
    value.propertyIds.length === 0;

  function setRange(range: DateRange) {
    onChange({ ...value, from: range.from, to: range.to });
  }

  function toggleProperty(id: string) {
    const set = new Set(value.propertyIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...value, propertyIds: Array.from(set) });
  }

  function applyPreset(key: PresetKey) {
    const r = presetRange(key);
    onChange({ ...value, from: r.from, to: r.to });
  }

  function reset() {
    onChange({ from: def.from, to: def.to, propertyIds: [] });
  }

  const activePreset = matchPreset(value.from, value.to);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Propiedades
        </span>
        {properties.map((p) => {
          const active = value.propertyIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProperty(p.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium border-border"
                  : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Período
          </span>
          {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => {
            const isActive = activePreset === key;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => applyPreset(key)}
                aria-pressed={isActive}
              >
                {PRESET_LABELS[key]}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <DateRangePicker
            from={value.from}
            to={value.to}
            onChange={setRange}
            placeholder="Rango personalizado"
            ariaLabel="Filtrar reportes por rango de fechas"
            className="sm:w-[280px]"
          />
          <ResetFiltersButton
            onClick={reset}
            disabled={isDefault}
            label="Restablecer"
          />
        </div>
      </div>
    </div>
  );
}

function matchPreset(from: string, to: string): PresetKey | null {
  for (const key of ["thisMonth", "lastMonth", "thisYear", "lastYear"] as PresetKey[]) {
    const r = presetRange(key);
    if (r.from === from && r.to === to) return key;
  }
  return null;
}
