"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={(v) => setParam("source", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los canales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            <SelectItem value="airbnb">Airbnb</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="direct">Directo</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paid} onValueChange={(v) => setParam("paid", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Pago: todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Pago: todos</SelectItem>
            <SelectItem value="paid">Pagadas</SelectItem>
            <SelectItem value="partial">Parciales</SelectItem>
            <SelectItem value="unpaid">Impagas</SelectItem>
          </SelectContent>
        </Select>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setParam("from", e.target.value || null)}
            aria-label="Desde"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setParam("to", e.target.value || null)}
            aria-label="Hasta"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll} className="md:col-span-1 self-end">
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
