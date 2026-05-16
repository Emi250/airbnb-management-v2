"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Phone, MessageCircle } from "lucide-react";
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
import { formatDateShort, telLink, whatsAppLink } from "@/lib/format";
import { STATUS_LABEL_PLURAL } from "@/lib/reservation-options";
import { groupByCheckInDay, relativeDayLabel, type CalendarDay } from "@/lib/calendar";
import type { Property, ReservationStatus } from "@/types/supabase";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

const STATUS_DEFAULT = "active";
const DEPT_DEFAULT = "all";

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
  const deptFilter = sp.get("dept") ?? DEPT_DEFAULT;
  const showPast = sp.get("past") === "1";
  const monthFilter = sp.get("month") ?? defaultMonth;

  // El input de búsqueda es controlado aparte para no escribir la URL por tecla.
  const [searchInput, setSearchInput] = useState(urlSearch);

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
    return { start: startStr, end: format(end, "yyyy-MM-dd") };
  }, [monthFilter]);

  // Sincroniza la URL cuando el usuario deja de tipear.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === urlSearch) return;
      setParam("q", searchInput || null);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Si la URL cambia por fuera (botón atrás), refleja el cambio en el input.
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    const isDefaultValue =
      value === null ||
      value === "" ||
      (key === "status" && value === STATUS_DEFAULT) ||
      (key === "dept" && value === DEPT_DEFAULT) ||
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
    deptFilter === DEPT_DEFAULT &&
    !showPast &&
    monthFilter === defaultMonth;

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter === "active" && r.status === "cancelled") return false;
      if (statusFilter !== "active" && statusFilter !== "all" && r.status !== statusFilter)
        return false;
      if (deptFilter !== DEPT_DEFAULT && r.property_id !== deptFilter) return false;
      if (!showPast && r.check_out < today) return false;
      // La reserva se agrupa por su día de check-in: filtramos por mes de llegada.
      if (r.check_in < monthRange.start || r.check_in >= monthRange.end) return false;
      if (urlSearch) {
        const s = urlSearch.toLowerCase();
        const matchGuest = r.guest?.name?.toLowerCase().includes(s);
        const matchPhone = r.guest?.phone?.toLowerCase().includes(s);
        if (!matchGuest && !matchPhone) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, deptFilter, showPast, today, urlSearch, monthRange]);

  const days = useMemo(() => groupByCheckInDay(filtered), [filtered]);

  const searchId = useId();
  const totalCount = filtered.length;

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
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
          <SelectTrigger className="w-[160px] capitalize" aria-label="Filtrar por mes">
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

        <Select value={deptFilter} onValueChange={(v) => setParam("dept", v)}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por departamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los deptos</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-[150px]" aria-label="Filtrar por estado">
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
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
            showPast
              ? "bg-secondary text-foreground font-medium border-border"
              : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {showPast ? "✓ " : ""}Mostrar pasadas
        </button>

        <ResetFiltersButton onClick={resetFilters} disabled={isDefaultFilter} />

        {canWrite && (
          <Button asChild size="sm" className="ml-auto h-9">
            <Link href="/reservations/new" aria-label="Nueva reserva">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Nueva reserva</span>
            </Link>
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {totalCount} {totalCount === 1 ? "llegada" : "llegadas"} en el mes
      </p>

      {/* Lista por día */}
      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-12 text-center text-sm text-muted-foreground">
          Sin llegadas con los filtros aplicados.
        </div>
      ) : (
        <div className="space-y-7">
          {days.map((day) => (
            <DayGroup key={day.date} day={day} today={today} canWrite={canWrite} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayGroup({
  day,
  today,
  canWrite,
}: {
  day: CalendarDay;
  today: string;
  canWrite: boolean;
}) {
  const isToday = day.date === today;
  const rel = relativeDayLabel(day.date, today);
  return (
    <section className="space-y-2.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {isToday && (
          <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            Hoy
          </span>
        )}
        <span className="capitalize">
          {format(parseISO(day.date), "EEEE d 'de' MMMM", { locale: es })}
        </span>
        {rel && !isToday && (
          <span className="text-xs font-normal text-muted-foreground">· {rel}</span>
        )}
      </h2>
      <div className="space-y-2.5">
        {day.reservations.map((r) => (
          <ReservationCard key={r.id} r={r} today={today} canWrite={canWrite} />
        ))}
      </div>
    </section>
  );
}

function ReservationCard({
  r,
  today,
  canWrite,
}: {
  r: ReservationWithRefs;
  today: string;
  canWrite: boolean;
}) {
  const color = r.property?.color_hex ?? "#0f7d77";
  const isToday = r.check_in === today;
  const tel = telLink(r.guest?.phone ?? null);
  const wa = whatsAppLink(r.guest?.phone ?? null);
  const guestName = r.guest?.name ?? "Sin huésped";
  const propertyName = r.property?.name ?? "Departamento";
  const ariaLabel = `Reserva de ${guestName} en ${propertyName}, del ${formatDateShort(
    r.check_in
  )} al ${formatDateShort(r.check_out)}`;

  return (
    <article
      className="relative rounded-xl border border-border bg-card transition-colors hover:bg-secondary/30 focus-within:bg-secondary/30"
      style={{ borderLeftWidth: 6, borderLeftColor: color }}
    >
      {/* Cuando el usuario puede editar, toda la tarjeta enlaza al detalle. */}
      {canWrite && (
        <Link
          href={`/reservations/${r.id}`}
          aria-label={ariaLabel}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}

      {/* Contenido visual: no interactivo, deja pasar el clic al enlace de arriba. */}
      <div className="pointer-events-none relative z-[1] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
              color,
            }}
            translate="no"
          >
            {propertyName}
          </span>
          {isToday && (
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Llega hoy
            </span>
          )}
        </div>

        <p className="mt-2.5 text-lg font-semibold leading-tight md:text-xl">{guestName}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="numeric text-foreground">
            {formatDateShort(r.check_in)} <span aria-hidden="true">→</span>{" "}
            {formatDateShort(r.check_out)}
          </span>
          <span className="numeric">
            {r.nights} {r.nights === 1 ? "noche" : "noches"}
          </span>
          <span className="numeric">
            {r.num_guests} {r.num_guests === 1 ? "huésped" : "huéspedes"}
          </span>
        </div>
      </div>

      {/* Acciones de contacto: capa interactiva por encima del enlace de tarjeta. */}
      {r.guest?.phone && (tel || wa) && (
        <div className="relative z-[2] flex flex-wrap items-center gap-2 px-4 pb-4 md:px-5 md:pb-5">
          {tel && (
            <a
              href={tel}
              aria-label={`Llamar a ${guestName}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Llamar
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              aria-label={`Escribir a ${guestName} por WhatsApp`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-success px-3 py-3 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <span
            className="numeric w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto"
            translate="no"
          >
            {r.guest.phone}
          </span>
        </div>
      )}
    </article>
  );
}
