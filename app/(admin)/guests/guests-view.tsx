"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/reservation-options";
import type { Guest, ReservationSource } from "@/types/supabase";

type ReservationLite = {
  guest_id: string | null;
  source: ReservationSource;
  total_amount_ars: number;
  status: string;
  check_in: string;
};

type SourceFilter = "all" | ReservationSource;

export function GuestsView({
  guests,
  reservations,
}: {
  guests: Guest[];
  reservations: ReservationLite[];
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const stats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; lastStay: string | null; sources: Set<ReservationSource> }
    >();
    for (const r of reservations) {
      if (!r.guest_id) continue;
      const cur =
        map.get(r.guest_id) ??
        { count: 0, total: 0, lastStay: null as string | null, sources: new Set<ReservationSource>() };
      cur.sources.add(r.source);
      if (r.status !== "cancelled") {
        cur.count += 1;
        cur.total += Number(r.total_amount_ars);
        if (!cur.lastStay || r.check_in > cur.lastStay) cur.lastStay = r.check_in;
      }
      map.set(r.guest_id, cur);
    }
    return map;
  }, [reservations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (q) {
        const name = g.name?.toLowerCase() ?? "";
        const phone = g.phone?.toLowerCase() ?? "";
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (sourceFilter !== "all") {
        const s = stats.get(g.id);
        if (!s || !s.sources.has(sourceFilter)) return false;
      }
      return true;
    });
  }, [guests, search, sourceFilter, stats]);

  const isDefault = search === "" && sourceFilter === "all";
  const searchId = useId();

  function reset() {
    setSearch("");
    setSourceFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <label htmlFor={searchId} className="sr-only">
            Buscar huésped por nombre o teléfono
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="pl-9"
          />
        </div>

        <Select
          value={sourceFilter}
          onValueChange={(v) => setSourceFilter(v as SourceFilter)}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por plataforma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            {(Object.entries(SOURCE_LABEL) as [ReservationSource, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <ResetFiltersButton onClick={reset} disabled={isDefault} />

        <p
          className="ml-auto text-xs text-muted-foreground hidden sm:block"
          aria-live="polite"
        >
          {filtered.length} {filtered.length === 1 ? "huésped" : "huéspedes"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Sin huéspedes con los filtros aplicados.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>País</TableHead>
              <TableHead className="text-right">Reservas</TableHead>
              <TableHead className="text-right">Total gastado</TableHead>
              <TableHead>Última estadía</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => {
              const s = stats.get(g.id);
              return (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link
                      href={`/guests/${g.id}`}
                      className="font-medium hover:underline"
                    >
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell>{g.phone ?? "—"}</TableCell>
                  <TableCell>{g.email ?? "—"}</TableCell>
                  <TableCell>{g.country ?? "—"}</TableCell>
                  <TableCell className="numeric text-right">{s?.count ?? 0}</TableCell>
                  <TableCell className="numeric text-right">
                    {formatCurrency(s?.total ?? 0)}
                  </TableCell>
                  <TableCell>
                    {s?.lastStay ? formatDateShort(s.lastStay) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
