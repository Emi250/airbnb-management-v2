"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { Property } from "@/types/supabase";

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

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {properties.map((p) => {
          const active = propertyIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProperty(p.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                active ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="col-span-2 md:col-span-2 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar huésped..."
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="confirmed">Confirmadas</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select
          value={source}
          onChange={(e) => setParam("source", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos los canales</option>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
          <option value="direct">Directo</option>
          <option value="other">Otro</option>
        </select>
        <select
          value={paid}
          onChange={(e) => setParam("paid", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Pago: todos</option>
          <option value="paid">Pagadas</option>
          <option value="partial">Parciales</option>
          <option value="unpaid">Impagas</option>
        </select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setParam("from", e.target.value || null)}
          aria-label="Desde"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setParam("to", e.target.value || null)}
          aria-label="Hasta"
        />
        <Button variant="ghost" size="sm" onClick={clearAll} className="md:col-span-1">
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
