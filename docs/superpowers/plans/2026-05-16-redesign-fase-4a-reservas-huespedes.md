# Rediseño Refugio del Corazón — Fase 4A: Reservas y Huéspedes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la jerarquía visual y de layout de las páginas de **Reservas** y **Huéspedes**. En Reservas: convertir el panel de filtros (hoy 6 filas en mobile) en una barra compacta con un toggle "Filtros" que expande/colapsa los filtros secundarios, dejando siempre visibles la búsqueda y el botón de restablecer, con un contador de filtros activos cuando está colapsado; reordenar y agrupar las columnas de la tabla por prioridad de tarea (departamento, huésped, fechas, estado de pago); convertir la tabla en tarjetas apiladas en mobile; y dar visibilidad clara al botón "Exportar". En Huéspedes: hacer la tabla ordenable (por total gastado, por recencia y por cantidad de reservas) con orden client-side, agregar acciones rápidas de contacto (Llamar y WhatsApp) por fila, y convertir la tabla en tarjetas apiladas en mobile. Sin features nuevas, sin cambios de lógica de negocio ni de base de datos.

**Architecture:** Cambio puramente de layout, jerarquía e interacción client-side. Se crean dos helpers de UI reutilizados por ambas páginas: `components/ui/contact-actions.tsx` (botones `Llamar` / `WhatsApp` que sólo se renderizan si hay teléfono, usando `telLink` / `whatsAppLink` de `lib/format.ts`) y `components/ui/sortable-header.tsx` (un `<th>` con botón clickeable que muestra un ícono de dirección de orden). `ReservationsFilters` mantiene su contrato con la URL (`router.replace` sobre `searchParams`) y su estado server-side intacto; sólo se reorganiza el JSX en una barra colapsable con `useState` local para `abierto`. `ReservationsTable` reordena/agrupa columnas y agrega una vista de tarjetas (`md:hidden`) además de la tabla (`hidden md:block`); la lógica de `exportCsv` no cambia y el botón se sube al `PageHeader`. `GuestsView` agrega estado de orden client-side (`useState` de `{ key, dir }`), aplica el `sort` sobre la lista ya filtrada con `useMemo`, y renderiza tabla + tarjetas. **Decisión "última estadía":** la consulta de `guests/page.tsx` selecciona `reservations(guest_id, source, total_amount_ars, status, check_in)` — **no expone el `id` de la reserva**. Para no tocar la capa de datos, la "última estadía" se deja como **texto plano** (la fecha formateada), igual que hoy; no se enlaza. El nombre del huésped ya enlaza a `/guests/[id]`, que es el lugar correcto para profundizar. Esto se documenta como limitación conocida (ver Task 6). `guests/page.tsx` y `reservations/page.tsx` no cambian su interfaz de props ni sus queries.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, date-fns (`es`), componentes shadcn existentes (`Table`, `Badge`, `Button`, `Input`, `Select`, `StatusBadge`/`PaidBadge`, `EmptyState`, `ResetFiltersButton`, `DateRangePicker`), helpers de `lib/format.ts`, tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación de cada tarea: `pnpm typecheck`, `pnpm exec eslint <archivos modificados>` y `pnpm build`. NO usar `pnpm lint` — lintea archivos generados con errores preexistentes. No hay infraestructura de tests unitarios en el proyecto; la verificación es typecheck + eslint + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `components/ui/contact-actions.tsx` | Crear | Botones `Llamar` y `WhatsApp` para un teléfono; no renderiza nada si no hay teléfono. Reutilizado por Reservas y Huéspedes. |
| `components/ui/sortable-header.tsx` | Crear | Celda `<th>` con botón clickeable e ícono de dirección de orden. Reutilizable; usado en Huéspedes. |
| `app/(admin)/reservations/reservations-filters.tsx` | Modificar | Barra de filtros compacta y colapsable, con búsqueda y reset siempre visibles y contador de filtros activos. |
| `app/(admin)/reservations/reservations-table.tsx` | Modificar | Reordenar/agrupar columnas; vista de tarjetas apiladas en mobile; aceptar el botón Exportar como render externo. |
| `app/(admin)/reservations/page.tsx` | Modificar | Subir el botón "Exportar CSV" al `PageHeader` para que sea visible. |
| `app/(admin)/guests/guests-view.tsx` | Modificar | Orden client-side por columnas; acciones de contacto por fila; vista de tarjetas apiladas en mobile. |

`app/(admin)/guests/page.tsx`, `components/page-header.tsx`, `components/status-badge.tsx`, `components/ui/table.tsx`, `components/ui/badge.tsx`, `components/empty-state.tsx`, `lib/format.ts`, `lib/reservation-options.ts` y `lib/queries/reservations.ts` NO se modifican.

---

## Task 1: Crear el helper `ContactActions`

Helper reutilizable: botones `Llamar` (tel:) y `WhatsApp` (wa.me). No renderiza nada si el teléfono es nulo o vacío. Touch targets >=44px en mobile. Esta tarea no cambia ninguna pantalla todavía; sólo agrega el archivo.

**Files:**
- Crear: `components/ui/contact-actions.tsx`

- [ ] **Step 1: Crear `components/ui/contact-actions.tsx`** con exactamente este contenido:

```tsx
import { Phone, MessageCircle } from "lucide-react";
import { telLink, whatsAppLink } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Acciones rápidas de contacto para un huésped: Llamar (tel:) y WhatsApp (wa.me).
 * No renderiza nada si el teléfono es nulo/vacío o no produce un link válido.
 * Los enlaces tienen un área táctil >=44px para uso cómodo en mobile.
 * Con `showNumber` muestra además el número de teléfono como texto, para que
 * el operador lo vea de un vistazo (mismo patrón que las tarjetas del calendario).
 */
export function ContactActions({
  phone,
  name,
  showNumber = false,
  className,
}: {
  /** Teléfono crudo del huésped; puede ser null. */
  phone: string | null | undefined;
  /** Nombre del huésped, para etiquetas accesibles. */
  name?: string | null;
  /** Si es true, muestra el número de teléfono como texto junto a los botones. */
  showNumber?: boolean;
  className?: string;
}) {
  const tel = telLink(phone);
  const wa = whatsAppLink(phone);
  if (!tel && !wa) return null;

  const who = name?.trim() ? ` a ${name.trim()}` : "";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showNumber && phone?.trim() ? (
        <span className="numeric whitespace-nowrap text-sm text-muted-foreground">
          {phone.trim()}
        </span>
      ) : null}
      {tel ? (
        <a
          href={tel}
          aria-label={`Llamar${who}`}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Llamar</span>
        </a>
      ) : null}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir WhatsApp${who}`}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
```

Notas: en mobile cada enlace mide `h-11` (44px) y `min-w-11`; desde `sm` baja a `h-8` para alinearse con el resto de controles compactos del escritorio. Las etiquetas de texto se ocultan en mobile (`hidden sm:inline`) dejando sólo el ícono, pero `aria-label` siempre da el contexto completo. Con `showNumber` el componente antepone el número de teléfono como texto (`muted-foreground`), igual que en las tarjetas del calendario, para que el operador vea el número sin abrir el detalle. Sólo tokens de color (`muted-foreground`, `secondary`, `foreground`, `ring`); sin hex hardcodeado.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores (el componente todavía no se usa, pero debe compilar).
  - `pnpm exec eslint components/ui/contact-actions.tsx` → sin errores ni warnings.
  - Esperado: el archivo compila; aún no aparece en pantalla.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(ui): helper ContactActions con Llamar y WhatsApp"
```

---

## Task 2: Crear el helper `SortableHeader`

Celda `<th>` con botón clickeable que dispara el cambio de orden y muestra un ícono según la dirección. Reutilizable; en esta fase la usa Huéspedes (Task 5). Esta tarea no cambia ninguna pantalla todavía.

**Files:**
- Crear: `components/ui/sortable-header.tsx`

- [ ] **Step 1: Crear `components/ui/sortable-header.tsx`** con exactamente este contenido:

```tsx
"use client";

import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

/**
 * Celda de cabecera ordenable para una `Table`. Renderiza un `<th>` con un
 * botón a todo el ancho que dispara `onSort`. El ícono refleja el estado:
 * sin orden activo (doble flecha tenue), orden ascendente o descendente.
 */
export function SortableHeader({
  label,
  active,
  direction,
  onSort,
  align = "left",
  className,
}: {
  /** Texto visible de la columna. */
  label: string;
  /** True si esta columna es la que ordena la tabla actualmente. */
  active: boolean;
  /** Dirección actual; sólo relevante cuando `active` es true. */
  direction: SortDirection;
  /** Handler de click: alterna/activa el orden de esta columna. */
  onSort: () => void;
  /** Alineación del contenido; usar "right" para columnas numéricas. */
  align?: "left" | "right";
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={onSort}
        aria-label={`Ordenar por ${label}`}
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", !active && "opacity-50")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
```

Notas: `aria-sort` se aplica sobre el botón para anunciar el estado de orden a lectores de pantalla. El botón hereda el `<th>` de `components/ui/table.tsx` sin modificarlo. Para columnas numéricas (`align="right"`) el ícono va a la izquierda del texto vía `flex-row-reverse`, igual que el resto de columnas numéricas alineadas a la derecha. Sólo tokens de color.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint components/ui/sortable-header.tsx` → sin errores ni warnings.
  - Esperado: el archivo compila; aún no aparece en pantalla.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(ui): helper SortableHeader para tablas ordenables"
```

---

## Task 3: Barra de filtros compacta y colapsable en Reservas

`ReservationsFilters` pasa de un panel de ~6 filas a una barra compacta: fila siempre visible con búsqueda + toggle "Filtros" (con contador de filtros activos) + reset; bloque colapsable con propiedades, estado, canal, pago y rango de fechas. La lógica de URL (`setParam`, `setRange`, `toggleProperty`, `clearAll`) no cambia.

**Files:**
- Modificar: `app/(admin)/reservations/reservations-filters.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/reservations/reservations-filters.tsx`** con exactamente este contenido:

```tsx
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
import { ResetFiltersButton } from "@/components/ui/reset-filters-button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
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

  // Cantidad de filtros secundarios activos (todo menos la búsqueda de texto).
  // El rango de fechas cuenta como un único filtro.
  const activeCount =
    (status !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0) +
    (paid !== "all" ? 1 : 0) +
    propertyIds.length +
    (from !== "" || to !== "" ? 1 : 0);

  // El panel arranca abierto si ya hay filtros secundarios aplicados,
  // para que el usuario vea de inmediato qué está filtrando.
  const [open, setOpen] = useState(activeCount > 0);

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

  const isDefaultFilter = q === "" && activeCount === 0;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card">
      {/* Fila siempre visible: búsqueda + toggle Filtros + restablecer. */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar huésped..."
            className="pl-9"
            aria-label="Buscar huésped"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="reservations-filters-panel"
          className="h-9"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </Button>

        <ResetFiltersButton
          onClick={clearAll}
          disabled={isDefaultFilter}
          label="Restablecer"
          className="h-9"
        />
      </div>

      {/* Panel colapsable con los filtros secundarios. */}
      {open ? (
        <div
          id="reservations-filters-panel"
          className="space-y-3 border-t border-border p-3"
        >
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

Notas: el toggle "Filtros" usa `useState` local (`open`); arranca abierto si ya hay filtros secundarios activos (`activeCount > 0`) para no esconder el estado actual. El contador (`activeCount`) suma estado + canal + pago + cada propiedad seleccionada + el rango de fechas como uno solo, y se muestra como pill sobre el botón cuando está colapsado o abierto. La búsqueda y el reset quedan siempre visibles en la fila superior. La lógica de URL no cambió: `setParam`, `setRange`, `toggleProperty` y `clearAll` son idénticos al original. El `ResetFiltersButton` recibe `h-9` para alinearse en altura con el `Input` y el botón "Filtros". Sólo tokens de color; el único hex es el fallback `#A47148` ya presente en el original.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/reservations/reservations-filters.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/reservations` los filtros se ven como una barra de una fila (búsqueda + Filtros + Restablecer). Al tocar "Filtros" se despliega el panel con propiedades, estado, canal, pago y rango. Con filtros aplicados aparece el contador numérico en el botón.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(reservations): barra de filtros compacta y colapsable"
```

---

## Task 4: Reordenar columnas y agregar tarjetas mobile en la tabla de Reservas

`ReservationsTable` reordena las columnas por prioridad (Departamento, Huésped, Fechas, Estado, Pago, Canal, acción), **fusiona las dos columnas financieras redundantes** (Total y Saldo) en una sola celda "Importe" que muestra el total con el saldo como dato secundario, y agrega una vista de tarjetas apiladas para mobile. La función `exportCsv` se extrae a un componente exportable para que `page.tsx` la suba al `PageHeader` (Task 5). El CSV exportado mantiene todas las columnas.

**Decisión de columnas:** orden nuevo = **Departamento → Huésped → Fechas (check-in / check-out en una celda) → Importe (total + saldo) → Estado → Pago → Canal → acción**. Se eliminan como columnas separadas **Noches** y **Huéspedes** (datos de bajo valor para el escaneo de la lista; siguen disponibles en el detalle de la reserva y en el CSV) y se **fusionan Total y Saldo** en la celda "Importe": el total como cifra principal y el saldo pendiente como línea secundaria sólo cuando hay saldo > 0. Así se pasa de 12 a 8 columnas sin perder datos accionables (estado de pago sigue como `PaidBadge`).

**Files:**
- Modificar: `app/(admin)/reservations/reservations-table.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/reservations/reservations-table.tsx`** con exactamente este contenido:

```tsx
"use client";

import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, PaidBadge } from "@/components/status-badge";
import { ContactActions } from "@/components/ui/contact-actions";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/reservation-options";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

/** Genera y descarga el CSV de reservas. Mantiene todas las columnas de datos. */
function buildAndDownloadCsv(rows: ReservationWithRefs[]) {
  const header = [
    "Propiedad",
    "Huésped",
    "Check-in",
    "Check-out",
    "Noches",
    "Huéspedes",
    "Total ARS",
    "Pagado ARS",
    "Saldo ARS",
    "Estado",
    "Canal",
    "Teléfono",
  ];
  const lines = rows.map((r) =>
    [
      r.property?.name ?? "",
      r.guest?.name ?? "",
      r.check_in,
      r.check_out,
      r.nights,
      r.num_guests,
      r.total_amount_ars,
      r.amount_paid_ars,
      r.total_amount_ars - r.amount_paid_ars,
      r.status,
      r.source,
      r.guest?.phone ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Botón "Exportar CSV". Se renderiza desde la page en el PageHeader para que
 * la acción sea claramente visible. No depende del montaje de la tabla.
 */
export function ExportReservationsButton({
  rows,
}: {
  rows: ReservationWithRefs[];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => buildAndDownloadCsv(rows)}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}

export function ReservationsTable({ rows }: { rows: ReservationWithRefs[] }) {
  return (
    <>
      {/* Vista de tabla — desde md hacia arriba. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead>Huésped</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="w-[80px] text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const balance = r.total_amount_ars - r.amount_paid_ars;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/reservations/${r.id}`}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: r.property?.color_hex ?? "#A47148",
                        }}
                      />
                      {r.property?.name}
                    </Link>
                  </TableCell>
                  <TableCell>{r.guest?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span>{formatDateShort(r.check_in)}</span>
                    <span className="px-1 text-muted-foreground">→</span>
                    <span>{formatDateShort(r.check_out)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.nights} {r.nights === 1 ? "noche" : "noches"})
                    </span>
                  </TableCell>
                  <TableCell className="numeric text-right">
                    <span className="font-medium">
                      {formatCurrency(r.total_amount_ars)}
                    </span>
                    {balance > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        Saldo {formatCurrency(balance)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <PaidBadge
                      paid={r.amount_paid_ars}
                      total={r.total_amount_ars}
                    />
                  </TableCell>
                  <TableCell>{SOURCE_LABEL[r.source]}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/reservations/${r.id}`}
                        aria-label={`Editar reserva de ${
                          r.guest?.name ?? "huésped"
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only lg:not-sr-only">Editar</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Vista de tarjetas apiladas — sólo en mobile. */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const balance = r.total_amount_ars - r.amount_paid_ars;
          return (
            <li key={r.id}>
              <Link
                href={`/reservations/${r.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: r.property?.color_hex ?? "#A47148",
                      }}
                    />
                    {r.property?.name}
                  </span>
                  <StatusBadge status={r.status} />
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {r.guest?.name ?? "—"}
                </p>

                <p className="mt-2 text-sm">
                  <span>{formatDateShort(r.check_in)}</span>
                  <span className="px-1 text-muted-foreground">→</span>
                  <span>{formatDateShort(r.check_out)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({r.nights} {r.nights === 1 ? "noche" : "noches"})
                  </span>
                </p>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="numeric text-base font-semibold">
                      {formatCurrency(r.total_amount_ars)}
                    </p>
                    {balance > 0 ? (
                      <p className="numeric text-xs text-muted-foreground">
                        Saldo {formatCurrency(balance)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <PaidBadge
                      paid={r.amount_paid_ars}
                      total={r.total_amount_ars}
                    />
                    <span className="text-xs text-muted-foreground">
                      {SOURCE_LABEL[r.source]}
                    </span>
                  </div>
                </div>
              </Link>

              {r.guest?.phone ? (
                <div className="mt-1 px-1">
                  <ContactActions phone={r.guest.phone} name={r.guest.name} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

Notas: la tabla pasa de 12 a 8 columnas. Check-in/check-out se agrupan en una celda "Fechas" con las noches como dato secundario; Total y Saldo se fusionan en "Importe" (total como cifra principal, saldo sólo si es > 0). Noches y Huéspedes dejan de ser columnas — siguen en el CSV y en el detalle. El canal usa `SOURCE_LABEL` (etiqueta legible "Airbnb"/"Booking"/"Directo"/"Otro") en lugar del enum crudo con `capitalize`. La vista mobile (`md:hidden`) es una tarjeta apilada por reserva, clickeable hacia el detalle, con las acciones de contacto debajo para no anidar enlaces dentro del `<Link>` de la tarjeta. El botón Exportar sale del cuerpo de la tabla y se expone como `ExportReservationsButton` para montarlo en el `PageHeader` (Task 5). `exportCsv` mantiene exactamente las mismas columnas y formato; sólo se renombró a `buildAndDownloadCsv`. El único hex es el fallback `#A47148` ya presente.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/reservations/reservations-table.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en escritorio la tabla muestra 8 columnas reordenadas; en mobile (ancho < 768px) se ve una pila de tarjetas. El botón Exportar ya no aparece sobre la tabla (se monta en Task 5). Nota: entre la Task 4 y la Task 5 la página de Reservas no muestra el botón Exportar en ningún lado; queda resuelto al cerrar la Task 5.

- [ ] **Step 3: NO hacer commit todavía.** El botón Exportar queda sin montar entre la Task 4 y la Task 5. El commit se hace al final de la Task 5.

---

## Task 5: Subir el botón "Exportar" al PageHeader de Reservas

`reservations/page.tsx` monta `ExportReservationsButton` junto a "Nueva reserva" en las acciones del `PageHeader`, dándole visibilidad clara.

**Files:**
- Modificar: `app/(admin)/reservations/page.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/reservations/page.tsx`** con exactamente este contenido:

```tsx
import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { listReservations, listProperties } from "@/lib/queries/reservations";
import {
  ReservationsTable,
  ExportReservationsButton,
} from "./reservations-table";
import { ReservationsFilters } from "./reservations-filters";
import { EmptyState } from "@/components/empty-state";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    status?: string;
    source?: string;
    paid?: "paid" | "unpaid" | "partial";
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const propertyIds = sp.property ? sp.property.split(",").filter(Boolean) : [];

  const [rows, properties] = await Promise.all([
    listReservations({
      propertyIds,
      status: sp.status,
      source: sp.source,
      from: sp.from,
      to: sp.to,
      search: sp.q,
      paid: sp.paid,
    }),
    listProperties(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reservas"
        description={`${rows.length} reservas con los filtros aplicados`}
        actions={
          <>
            <ExportReservationsButton rows={rows} />
            <Button asChild>
              <Link href="/reservations/new">
                <Plus className="h-4 w-4" />
                Nueva reserva
              </Link>
            </Button>
          </>
        }
      />

      <ReservationsFilters properties={properties} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" />}
          title="No hay reservas con esos filtros"
          description="Probá ampliar el rango o limpiar los filtros."
          ctaLabel="Nueva reserva"
          ctaHref="/reservations/new"
        />
      ) : (
        <ReservationsTable rows={rows} />
      )}
    </div>
  );
}
```

Notas: `ExportReservationsButton` recibe `rows` (las reservas ya filtradas) y se queda deshabilitado cuando no hay filas. El `PageHeader` ya envuelve `actions` en un contenedor `flex flex-wrap`, así que el botón de exportar y "Nueva reserva" se acomodan solos. Los imports de `Plus`/`ListChecks` se consolidan en una sola línea.

- [ ] **Step 2: Verificar (cierra Tasks 4 y 5).** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/reservations/page.tsx" "app/(admin)/reservations/reservations-table.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/reservations` el botón "Exportar CSV" aparece en el encabezado, junto a "Nueva reserva". Descarga el CSV con todas las columnas. La tabla reordenada y las tarjetas mobile funcionan.

- [ ] **Step 3: Commit (cierra Tasks 4 y 5).**

```
git commit -m "feat(reservations): tabla reordenada, tarjetas mobile y exportar visible"
```

---

## Task 6: Huéspedes — orden client-side, acciones de contacto y tarjetas mobile

`GuestsView` agrega: (1) orden client-side por columnas clickeables (total gastado, recencia/última estadía, cantidad de reservas) con `SortableHeader`; (2) acciones de contacto por fila con `ContactActions` (sólo si hay teléfono); (3) vista de tarjetas apiladas en mobile. Los filtros (búsqueda + plataforma + reset) y el cálculo de `stats` no cambian.

**Decisión "última estadía":** la query de `guests/page.tsx` selecciona `reservations(guest_id, source, total_amount_ars, status, check_in)` y **no incluye el `id` de la reserva**. Enlazar la última estadía a su reserva exigiría cambiar la query (capa de datos), lo cual el alcance de la Fase 4A prohíbe. Por eso la última estadía se mantiene como **texto plano** (la fecha formateada). El nombre del huésped sigue enlazando a `/guests/[id]`, que es el camino correcto para profundizar. Limitación documentada aquí; resolverla queda fuera de la Fase 4A.

**Files:**
- Modificar: `app/(admin)/guests/guests-view.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/guests/guests-view.tsx`** con exactamente este contenido:

```tsx
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
```

Notas: el orden es totalmente client-side (`useMemo` sobre `filtered`); no se toca la query ni `stats`. `toggleSort` alterna dirección si ya se ordena por esa columna, o activa la nueva con una dirección por defecto (numéricos y recencia en `desc`, nombre en `asc`). El email **no se muestra en ningún lugar de la tabla ni de las tarjetas** (decisión del product owner: prefiere el celular). El campo `email` puede seguir existiendo en los datos de `Guest`; simplemente no se renderiza. Las columnas "Teléfono" y "Email" del original se reemplazan por una única columna "Contacto" con `ContactActions` en modo `showNumber`: muestra el número de teléfono como texto más los botones Llamar (tel:) y WhatsApp (wa.me). Cuando el huésped no tiene teléfono, la celda muestra "Sin teléfono" en `muted-foreground` y ningún botón. El nombre del huésped ya no lleva ninguna sub-línea debajo. La "última estadía" queda como texto plano por la limitación de datos documentada arriba. La vista mobile (`md:hidden`) es una tarjeta por huésped con nombre enlazado, país, conteo de reservas, última estadía y, debajo, el número de teléfono con sus acciones de contacto (o "Sin teléfono"). El contador del encabezado pasa a usar `sorted.length` (mismo valor que `filtered.length`, ya que ordenar no cambia la cantidad).

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/guests/guests-view.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/guests` las cabeceras Nombre, Reservas, Total gastado y Última estadía son clickeables y reordenan la lista con el ícono de dirección. Cada fila con teléfono muestra Llamar y WhatsApp. En mobile la tabla se ve como tarjetas apiladas.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(guests): tabla ordenable, acciones de contacto y tarjetas mobile"
```

---

## Verificación final de la Fase 4A

- [ ] `pnpm typecheck` termina sin errores.
- [ ] `pnpm exec eslint "app/(admin)/reservations/**/*.tsx" "app/(admin)/guests/**/*.tsx" "components/ui/contact-actions.tsx" "components/ui/sortable-header.tsx"` termina sin errores ni warnings.
- [ ] `pnpm build` termina exitosamente.
- [ ] Revisión visual de Reservas (`/reservations`):
  - El panel de filtros es una barra compacta de una fila: búsqueda + botón "Filtros" + "Restablecer". El toggle "Filtros" expande/colapsa propiedades, estado, canal, pago y rango de fechas. Con filtros aplicados se ve el contador numérico en el botón.
  - La tabla muestra 8 columnas reordenadas: Departamento, Huésped, Fechas, Importe, Estado, Pago, Canal, acción. "Fechas" agrupa check-in/check-out + noches; "Importe" muestra total y, si hay, saldo.
  - El botón "Exportar CSV" está visible en el encabezado, junto a "Nueva reserva", y descarga el CSV con todas las columnas.
  - En mobile (< 768px) la tabla se ve como tarjetas apiladas con las acciones de contacto cuando hay teléfono.
- [ ] Revisión visual de Huéspedes (`/guests`):
  - Las cabeceras Nombre, Reservas, Total gastado y Última estadía ordenan la lista al hacer click, con el ícono de dirección correcto.
  - La columna "Contacto" muestra el número de teléfono como texto junto a las acciones Llamar (tel:) y WhatsApp (wa.me); los que no tienen teléfono muestran "Sin teléfono" sin botones. El email no aparece en ningún lugar de la tabla ni de las tarjetas.
  - La "última estadía" es texto plano (limitación de datos documentada en la Task 6).
  - En mobile la tabla se ve como tarjetas apiladas.
- [ ] Áreas táctiles de las acciones de contacto >=44px en mobile.
- [ ] Sin cambios de base de datos, de queries ni de lógica de negocio.
- [ ] Spanish rioplatense, sin emojis ni signos de exclamación en la UI.
