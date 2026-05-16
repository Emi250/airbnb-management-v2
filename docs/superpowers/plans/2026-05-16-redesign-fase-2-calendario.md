# Rediseño Refugio del Corazón — Fase 2: Calendario — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir la página de Calendario como una lista agrupada por día de llegada — la pantalla más usada por la encargada — con distinción fuerte de departamento, toda la información de cada reserva (fechas, noches, huéspedes, celular) y legibilidad total en celular.

**Architecture:** Se reemplaza el `CalendarView` actual (tabla agrupada por propiedad, con componentes separados `DesktopTable` y `MobileCards`) por una única lista responsive agrupada por día de check-in. La lógica de agrupación y de etiquetas de día relativas se extrae a un módulo puro `lib/calendar.ts`. El componente de la vista mantiene el mismo patrón de filtros por URL params que ya usa el proyecto, suma un filtro por departamento y elimina los montos de plata. La página servidor (`page.tsx`) no cambia su interfaz de props.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, date-fns (`es`), componentes shadcn existentes (Select, Input, Button), tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación de cada tarea: `pnpm typecheck`, `pnpm lint` (sobre el archivo modificado) y `pnpm build`. No hay infraestructura de tests unitarios en el proyecto; la verificación es typecheck + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `lib/calendar.ts` | Crear | Funciones puras: agrupar reservas por día de check-in y calcular la etiqueta de día relativa. |
| `app/(admin)/calendar/calendar-view.tsx` | Reescribir | Vista cliente: barra de filtros + lista agrupada por día + tarjeta de reserva. |
| `app/(admin)/calendar/page.tsx` | Modificar | Solo el texto `description` del `PageHeader`. |

`app/(admin)/calendar/loading.tsx` no cambia (el skeleton genérico sigue sirviendo).

---

## Task 1: Crear el módulo de utilidades del calendario

**Files:**
- Create: `lib/calendar.ts`

- [ ] **Step 1: Crear `lib/calendar.ts`** con exactamente este contenido:

```ts
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

export type CalendarDay = {
  /** Fecha de check-in en formato yyyy-MM-dd. */
  date: string;
  reservations: ReservationWithRefs[];
};

/**
 * Agrupa reservas por su día de check-in. Los días sin reservas no aparecen.
 * Días ordenados ascendente; dentro de cada día, por nombre de propiedad.
 */
export function groupByCheckInDay(reservations: ReservationWithRefs[]): CalendarDay[] {
  const map = new Map<string, ReservationWithRefs[]>();
  for (const r of reservations) {
    const list = map.get(r.check_in);
    if (list) list.push(r);
    else map.set(r.check_in, [r]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      reservations: list
        .slice()
        .sort((a, b) => (a.property?.name ?? "").localeCompare(b.property?.name ?? "")),
    }));
}

/**
 * Etiqueta relativa de un día respecto de hoy. Ambos argumentos en yyyy-MM-dd.
 * Devuelve "mañana" o "en N días" para los próximos 7 días; null en cualquier
 * otro caso (hoy, pasado, o más de 7 días en el futuro).
 */
export function relativeDayLabel(dateStr: string, todayStr: string): string | null {
  const diff = differenceInCalendarDays(parseISO(dateStr), parseISO(todayStr));
  if (diff === 1) return "mañana";
  if (diff > 1 && diff <= 7) return `en ${diff} días`;
  return null;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/calendar.ts
git commit -m "feat(calendar): utilidades de agrupación por día de llegada"
```

---

## Task 2: Reescribir la vista del calendario

**Files:**
- Modify (full rewrite): `app/(admin)/calendar/calendar-view.tsx`
- Modify: `app/(admin)/calendar/page.tsx` (solo la prop `description`)

- [ ] **Step 1: Reemplazar el contenido completo de `app/(admin)/calendar/calendar-view.tsx`** por:

```tsx
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
```

- [ ] **Step 2: Actualizar la descripción en `app/(admin)/calendar/page.tsx`**

En `app/(admin)/calendar/page.tsx`, cambiar la línea del `PageHeader`:

```tsx
      <PageHeader title="Calendario" description="Vista cronológica multi-propiedad" />
```

por:

```tsx
      <PageHeader title="Calendario" description="Llegadas de huéspedes por día" />
```

No tocar nada más en `page.tsx` — la interfaz de props de `CalendarView` no cambió.

- [ ] **Step 3: Verificar typecheck, lint y build**

Run: `pnpm typecheck`
Expected: sin errores.

Run: `pnpm exec eslint "app/(admin)/calendar/calendar-view.tsx" "app/(admin)/calendar/page.tsx"`
Expected: sin errores. (No uses `pnpm lint` — lintea todo el repo incluyendo archivos generados con errores preexistentes ajenos.)

Run: `pnpm build`
Expected: compila sin errores.

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev`, iniciar sesión como admin y abrir `/calendar`.
Expected:
- Las reservas aparecen agrupadas bajo encabezados de día (ej. "martes 10 de junio"); el día de hoy lleva el chip "Hoy"; días próximos muestran "mañana" / "en N días".
- Cada tarjeta muestra: etiqueta de departamento de color, borde izquierdo grueso del mismo color, nombre del huésped, fechas check-in → check-out, noches, huéspedes, y botones Llamar/WhatsApp con el número.
- No se muestran montos de plata.
- El filtro por departamento, el de mes, el de estado, el toggle "Mostrar pasadas" y la búsqueda funcionan y se reflejan en la URL.
- Achicar a ancho de celular: las tarjetas se mantienen legibles y los botones Llamar/WhatsApp ocupan el ancho.
- Probar en modo claro y oscuro.

- [ ] **Step 5: Commit**

```bash
git add "app/(admin)/calendar/calendar-view.tsx" "app/(admin)/calendar/page.tsx"
git commit -m "feat(calendar): lista por día de llegada con distinción de departamento"
```

---

## Verificación final de la Fase 2

- [ ] **Step 1: Build completo**

Run: `pnpm typecheck && pnpm build`
Expected: ambos sin errores.

- [ ] **Step 2: Recorrido visual**

Run: `pnpm dev`. En `/calendar`: cambiar mes, departamento y estado; buscar un huésped; activar "Mostrar pasadas"; tocar Llamar y WhatsApp; abrir una tarjeta (como admin) y confirmar que navega al detalle de la reserva. Repetir en ancho de celular y en modo claro/oscuro.
Expected: todo legible, sin scroll horizontal, distinción de departamento clara, sin montos.

---

## Notas para las fases siguientes (fuera de alcance de este plan)

- **Fase 3 — Dashboard:** rediseño de jerarquía (un KPI héroe + 3 de apoyo, un gráfico, análisis por departamento).
- **Fase 4 — Resto de páginas:** Reservas, Gastos, Huéspedes, Propiedades, Reportes, Ajustes, Agenda.
