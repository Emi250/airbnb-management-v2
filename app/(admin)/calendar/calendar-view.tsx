"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, Search, Phone } from "lucide-react";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateLong, formatDateShort, telLink } from "@/lib/format";
import { STATUS_LABEL_PLURAL } from "@/lib/reservation-options";
import type { Property, ReservationStatus } from "@/types/supabase";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

const STATUS_DEFAULT = "active";

export function CalendarView({
  properties,
  reservations,
  today,
  canWrite = true,
}: {
  properties: Property[];
  reservations: ReservationWithRefs[];
  today: string;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const defaultMonth = today.slice(0, 7);
  const urlSearch = sp.get("q") ?? "";
  const statusFilter = sp.get("status") ?? STATUS_DEFAULT;
  const showPast = sp.get("past") === "1";
  const monthFilter = sp.get("month") ?? defaultMonth;

  // Local input mirrors URL but is controlled separately to avoid jank per keystroke.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const monthOptions = useMemo(() => {
    const anchor = parseISO(`${defaultMonth}-01`);
    const months: { value: string; label: string }[] = [];
    for (let i = 12; i >= 1; i--) {
      const d = subMonths(anchor, i);
      months.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) });
    }
    months.push({ value: defaultMonth, label: format(anchor, "MMMM yyyy", { locale: es }) });
    for (let i = 1; i <= 6; i++) {
      const d = addMonths(anchor, i);
      months.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) });
    }
    return months;
  }, [defaultMonth]);

  const monthRange = useMemo(() => {
    const startStr = `${monthFilter}-01`;
    const start = parseISO(startStr);
    const end = addMonths(start, 1);
    return {
      start: startStr,
      end: format(end, "yyyy-MM-dd"),
    };
  }, [monthFilter]);

  // Sync URL when user pauses typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === urlSearch) return;
      setParam("q", searchInput || null);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // If URL changes externally (back button), reflect it in the input.
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    const isDefaultValue =
      value === null ||
      value === "" ||
      (key === "status" && value === STATUS_DEFAULT) ||
      (key === "month" && value === defaultMonth);
    if (isDefaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function resetFilters() {
    router.replace(pathname);
    setSearchInput("");
  }

  const isDefaultFilter =
    urlSearch === "" &&
    statusFilter === STATUS_DEFAULT &&
    !showPast &&
    monthFilter === defaultMonth;

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter === "active" && r.status === "cancelled") return false;
      if (
        statusFilter !== "active" &&
        statusFilter !== "all" &&
        r.status !== statusFilter
      )
        return false;
      if (!showPast && r.check_out < today) return false;
      // Mes seleccionado: incluir reservas que se solapan con [monthRange.start, monthRange.end)
      if (r.check_in >= monthRange.end) return false;
      if (r.check_out <= monthRange.start) return false;
      if (urlSearch) {
        const s = urlSearch.toLowerCase();
        const matchGuest = r.guest?.name?.toLowerCase().includes(s);
        const matchPhone = r.guest?.phone?.toLowerCase().includes(s);
        if (!matchGuest && !matchPhone) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, showPast, today, urlSearch, monthRange]);

  const grouped = useMemo(() => {
    return properties.map((p) => ({
      property: p,
      rows: filtered
        .filter((r) => r.property_id === p.id)
        .sort((a, b) => a.check_in.localeCompare(b.check_in)),
    }));
  }, [filtered, properties]);

  function toggleCollapsed(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  }

  const searchId = useId();
  const totalCount = filtered.length;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <label htmlFor={searchId} className="sr-only">
            Buscar reservas por huésped o teléfono
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar huésped o teléfono…"
            className="pl-9"
          />
        </div>

        <Select value={monthFilter} onValueChange={(v) => setParam("month", v)}>
          <SelectTrigger className="w-[170px] capitalize" aria-label="Filtrar por mes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value} className="capitalize">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
            {(Object.entries(STATUS_LABEL_PLURAL) as [ReservationStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <button
          type="button"
          aria-pressed={showPast}
          onClick={() => setParam("past", showPast ? null : "1")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
            showPast
              ? "bg-secondary text-foreground font-medium border-border"
              : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {showPast ? "✓ " : ""}Mostrar pasadas
        </button>

        <ResetFiltersButton onClick={resetFilters} disabled={isDefaultFilter} />

        <p
          className="ml-auto text-xs text-muted-foreground hidden sm:block"
          aria-live="polite"
        >
          {totalCount} {totalCount === 1 ? "reserva" : "reservas"}
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-6">
        {grouped.map(({ property, rows }) => {
          const isCollapsed = collapsed.has(property.id);
          const panelId = `calendar-group-${property.id}`;
          return (
            <section key={property.id} className="space-y-2">
              <header className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  onClick={() => toggleCollapsed(property.id)}
                  className="group flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isCollapsed ? (
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
                      aria-hidden="true"
                    />
                  )}
                  <PropertyTag property={property} />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {rows.length} {rows.length === 1 ? "reserva" : "reservas"}
                  </span>
                </button>
                {canWrite && (
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link
                      href={`/reservations/new?property=${property.id}`}
                      aria-label={`Nueva reserva en ${property.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Nueva</span>
                    </Link>
                  </Button>
                )}
              </header>

              <div id={panelId} hidden={isCollapsed}>
                {!isCollapsed && (
                  <>
                    {rows.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
                        Sin reservas con los filtros aplicados.
                      </div>
                    ) : (
                      <>
                        <DesktopTable
                          rows={rows}
                          property={property}
                          today={today}
                          canWrite={canWrite}
                        />
                        <MobileCards
                          rows={rows}
                          property={property}
                          today={today}
                          canWrite={canWrite}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PropertyTag({ property }: { property: Property }) {
  const color = property.color_hex ?? "#A47148";
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
        color,
      }}
      translate="no"
    >
      {property.name}
    </span>
  );
}

function DesktopTable({
  rows,
  property,
  today,
  canWrite,
}: {
  rows: ReservationWithRefs[];
  property: Property;
  today: string;
  canWrite: boolean;
}) {
  const hrefFor = (id: string) => (canWrite ? `/reservations/${id}` : null);
  return (
    <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="w-[150px] px-4 py-2.5 text-left font-normal">Propiedad</th>
            <th className="w-[200px] px-4 py-2.5 text-left font-normal">Check-in</th>
            <th className="w-[200px] px-4 py-2.5 text-left font-normal">Check-out</th>
            <th className="px-4 py-2.5 text-left font-normal">Huésped</th>
            <th className="w-[90px] px-4 py-2.5 text-right font-normal">Σ Noches</th>
            <th className="w-[110px] px-4 py-2.5 text-right font-normal"># Huéspedes</th>
            <th className="w-[160px] px-4 py-2.5 text-right font-normal">Monto a pagar</th>
            <th className="w-[170px] px-4 py-2.5 text-left font-normal">Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isToday = r.check_in === today;
            const isPast = r.check_out < today;
            return (
              <tr
                key={r.id}
                className={cn(
                  "border-b border-border/40 last:border-b-0 transition-colors hover:bg-secondary/40 focus-within:bg-secondary/40",
                  isPast && "opacity-60"
                )}
              >
                <Cell href={hrefFor(r.id)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <PropertyTag property={property} />
                    {isToday && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-500">
                        Hoy
                      </span>
                    )}
                  </div>
                </Cell>
                <Cell href={hrefFor(r.id)}>
                  <span className="block truncate">{formatDateLong(r.check_in)}</span>
                </Cell>
                <Cell href={hrefFor(r.id)}>
                  <span className="block truncate">{formatDateLong(r.check_out)}</span>
                </Cell>
                <Cell href={hrefFor(r.id)}>
                  <span className="block min-w-0 truncate font-medium">
                    {r.guest?.name ?? "—"}
                  </span>
                </Cell>
                <Cell href={hrefFor(r.id)} align="right">
                  <span className="numeric">{r.nights}</span>
                </Cell>
                <Cell href={hrefFor(r.id)} align="right">
                  <span className="numeric">{r.num_guests}</span>
                </Cell>
                <Cell href={hrefFor(r.id)} align="right">
                  <span className="numeric">{formatCurrency(r.total_amount_ars)}</span>
                </Cell>
                <td className="px-4 py-2.5">
                  <PhoneCell phone={r.guest?.phone ?? null} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  children,
  href,
  align,
}: {
  children: React.ReactNode;
  href: string | null;
  align?: "right";
}) {
  const cellClass = cn("px-4 py-2.5", align === "right" && "text-right");
  if (!href) {
    return <td className={cellClass}>{children}</td>;
  }
  return (
    <td className={cellClass}>
      <Link
        href={href}
        className="block min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </Link>
    </td>
  );
}

function PhoneCell({ phone }: { phone: string | null }) {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  const tel = telLink(phone);
  if (!tel)
    return (
      <span className="block truncate text-muted-foreground" title={phone}>
        {phone}
      </span>
    );
  return (
    <a
      href={tel}
      className="inline-flex max-w-full items-center gap-1.5 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Llamar a ${phone}`}
    >
      <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="numeric truncate text-xs" translate="no">
        {phone}
      </span>
    </a>
  );
}

function MobileCards({
  rows,
  property,
  today,
  canWrite,
}: {
  rows: ReservationWithRefs[];
  property: Property;
  today: string;
  canWrite: boolean;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((r) => {
        const isToday = r.check_in === today;
        const isPast = r.check_out < today;
        const tel = telLink(r.guest?.phone ?? null);
        const ariaLabel = `Reserva de ${r.guest?.name ?? "huésped"} en ${property.name} del ${formatDateShort(r.check_in)} al ${formatDateShort(r.check_out)}`;
        return (
          <article
            key={r.id}
            className={cn(
              "relative rounded-lg border border-border bg-card transition-colors hover:bg-secondary/30 focus-within:bg-secondary/30",
              isPast && "opacity-70"
            )}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: property.color_hex ?? "#A47148",
            }}
          >
            {/* Full-card click target overlay (only when user has write access) */}
            {canWrite && (
              <Link
                href={`/reservations/${r.id}`}
                aria-label={ariaLabel}
                className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              />
            )}

            {/* Visual content sits above overlay but is non-interactive */}
            <div className="pointer-events-none relative z-[1] p-4">
              <div className="flex min-w-0 items-center gap-2">
                <PropertyTag property={property} />
                {isToday && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-500">
                    Hoy
                  </span>
                )}
                <span className="numeric ml-auto truncate text-sm font-semibold">
                  {formatCurrency(r.total_amount_ars)}
                </span>
              </div>
              <p className="mt-3 truncate text-base font-semibold">
                {r.guest?.name ?? "Sin huésped"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{formatDateShort(r.check_in)}</span>
                <span aria-hidden="true">→</span>
                <span>{formatDateShort(r.check_out)}</span>
                <span className="numeric">
                  · {r.nights}n · {r.num_guests}p
                </span>
              </div>
            </div>

            {/* Restored interactive area for the phone link */}
            {r.guest?.phone && tel && (
              <div className="relative z-[2] px-4 pb-4">
                <a
                  href={tel}
                  aria-label={`Llamar a ${r.guest.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  <span className="numeric" translate="no">
                    {r.guest.phone}
                  </span>
                </a>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
