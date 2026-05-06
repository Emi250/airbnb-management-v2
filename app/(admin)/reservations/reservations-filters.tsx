"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { STATUS_LABEL_PLURAL, SOURCE_LABEL } from "@/lib/reservation-options";
import type {
  Property,
  ReservationStatus,
  ReservationSource,
} from "@/types/supabase";

export function ReservationsFilters({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const status = sp.get("status") ?? "all";
  const source = sp.get("source") ?? "all";
  const paid = sp.get("paid") ?? "all";
  const propertyIds = (sp.get("property") ?? "").split(",").filter(Boolean);
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  useEffect(() => {
    const t = setTimeout(() => setParam("q", q || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === "all") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setRange(range: { from: string; to: string }) {
    const params = new URLSearchParams(sp.toString());
    if (range.from) params.set("from", range.from);
    else params.delete("from");
    if (range.to) params.set("to", range.to);
    else params.delete("to");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleProperty(id: string) {
    const set = new Set(propertyIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setParam("property", set.size === 0 ? null : Array.from(set).join(","));
  }

  function clearAll() {
    router.replace(pathname);
    setQ("");
  }

  const isDefaultFilter =
    q === "" &&
    status === "all" &&
    source === "all" &&
    paid === "all" &&
    propertyIds.length === 0 &&
    from === "" &&
    to === "";

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar huésped..."
          className="pl-9"
          aria-label="Buscar huésped"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Propiedades
        </span>
        {properties.map((p) => {
          const active = propertyIds.includes(p.id);
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger aria-label="Estado">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.entries(STATUS_LABEL_PLURAL) as [ReservationStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={(v) => setParam("source", v)}>
          <SelectTrigger aria-label="Canal">
            <SelectValue placeholder="Todos los canales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            {(Object.entries(SOURCE_LABEL) as [ReservationSource, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select value={paid} onValueChange={(v) => setParam("paid", v)}>
          <SelectTrigger aria-label="Pago">
            <SelectValue placeholder="Pago: todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pago: todos</SelectItem>
            <SelectItem value="paid">Pagadas</SelectItem>
            <SelectItem value="partial">Parciales</SelectItem>
            <SelectItem value="unpaid">Impagas</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          from={from}
          to={to}
          onChange={setRange}
          placeholder="Rango de fechas"
          ariaLabel="Filtrar por rango de fechas"
        />

        <ResetFiltersButton
          onClick={clearAll}
          disabled={isDefaultFilter}
          className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
          label="Restablecer"
        />
      </div>
    </div>
  );
}
