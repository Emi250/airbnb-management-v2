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
import {
  SortableHeader,
  type SortDirection,
} from "@/components/ui/sortable-header";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { ContactActions } from "@/components/ui/contact-actions";
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

/** Columnas ordenables de la tabla de huéspedes. */
type SortKey = "name" | "count" | "total" | "lastStay";

type GuestStats = {
  count: number;
  total: number;
  lastStay: string | null;
  sources: Set<ReservationSource>;
};

export function GuestsView({
  guests,
  reservations,
}: {
  guests: Guest[];
  reservations: ReservationLite[];
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDirection }>({
    key: "name",
    dir: "asc",
  });

  const stats = useMemo(() => {
    const map = new Map<string, GuestStats>();
    for (const r of reservations) {
      if (!r.guest_id) continue;
      const cur =
        map.get(r.guest_id) ??
        {
          count: 0,
          total: 0,
          lastStay: null as string | null,
          sources: new Set<ReservationSource>(),
        };
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

  // Orden client-side sobre la lista ya filtrada. El criterio "lastStay"
  // representa la recencia (estadía más reciente primero en desc).
  const sorted = useMemo(() => {
    const rows = [...filtered];
    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (key === "name") {
        return a.name.localeCompare(b.name, "es") * factor;
      }
      const sa = stats.get(a.id);
      const sb = stats.get(b.id);
      if (key === "count") {
        return ((sa?.count ?? 0) - (sb?.count ?? 0)) * factor;
      }
      if (key === "total") {
        return ((sa?.total ?? 0) - (sb?.total ?? 0)) * factor;
      }
      // key === "lastStay": las fechas ISO se comparan como string;
      // los huéspedes sin estadía van siempre al final.
      const la = sa?.lastStay ?? "";
      const lb = sb?.lastStay ?? "";
      if (la === lb) return 0;
      if (la === "") return 1;
      if (lb === "") return -1;
      return la < lb ? -1 * factor : 1 * factor;
    });
    return rows;
  }, [filtered, sort, stats]);

  const isDefault = search === "" && sourceFilter === "all";
  const searchId = useId();

  function reset() {
    setSearch("");
    setSourceFilter("all");
  }

  // Click en una cabecera: si ya ordena esa columna, alterna la dirección;
  // si es otra, la activa con una dirección por defecto sensata.
  function toggleSort(key: SortKey) {
    setSort((cur) => {
      if (cur.key === key) {
        return { key, dir: cur.dir === "asc" ? "desc" : "asc" };
      }
      // Numéricos y recencia arrancan en desc (mayor/más reciente primero);
      // el nombre arranca en asc (A→Z).
      return { key, dir: key === "name" ? "asc" : "desc" };
    });
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
          {sorted.length} {sorted.length === 1 ? "huésped" : "huéspedes"}
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Sin huéspedes con los filtros aplicados.
        </p>
      ) : (
        <>
          {/* Vista de tabla — desde md hacia arriba. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Nombre"
                    active={sort.key === "name"}
                    direction={sort.dir}
                    onSort={() => toggleSort("name")}
                  />
                  <TableHead>Contacto</TableHead>
                  <TableHead>País</TableHead>
                  <SortableHeader
                    label="Reservas"
                    align="right"
                    active={sort.key === "count"}
                    direction={sort.dir}
                    onSort={() => toggleSort("count")}
                  />
                  <SortableHeader
                    label="Total gastado"
                    align="right"
                    active={sort.key === "total"}
                    direction={sort.dir}
                    onSort={() => toggleSort("total")}
                  />
                  <SortableHeader
                    label="Última estadía"
                    active={sort.key === "lastStay"}
                    direction={sort.dir}
                    onSort={() => toggleSort("lastStay")}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((g) => {
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
                      <TableCell>
                        {g.phone ? (
                          <ContactActions
                            phone={g.phone}
                            name={g.name}
                            showNumber
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            Sin teléfono
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{g.country ?? "—"}</TableCell>
                      <TableCell className="numeric text-right">
                        {s?.count ?? 0}
                      </TableCell>
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
          </div>

          {/* Vista de tarjetas apiladas — sólo en mobile. */}
          <ul className="space-y-3 md:hidden">
            {sorted.map((g) => {
              const s = stats.get(g.id);
              return (
                <li
                  key={g.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/guests/${g.id}`}
                        className="font-medium hover:underline"
                      >
                        {g.name}
                      </Link>
                      {g.country ? (
                        <p className="text-xs text-muted-foreground">
                          {g.country}
                        </p>
                      ) : null}
                    </div>
                    <p className="numeric shrink-0 text-right text-sm font-semibold">
                      {formatCurrency(s?.total ?? 0)}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {s?.count ?? 0}{" "}
                    {(s?.count ?? 0) === 1 ? "reserva" : "reservas"}
                    {s?.lastStay ? (
                      <span> · Última estadía {formatDateShort(s.lastStay)}</span>
                    ) : null}
                  </p>

                  {g.phone ? (
                    <div className="mt-3">
                      <ContactActions
                        phone={g.phone}
                        name={g.name}
                        showNumber
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Sin teléfono
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
