# Rediseño Refugio del Corazón — Fase 3: Dashboard — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la jerarquía visual del Dashboard. En lugar de cuatro tarjetas KPI de igual peso, presentar un único KPI hero grande (Ingresos del mes vs. objetivo) con tres KPIs de apoyo más chicos (Beneficio neto, Ocupación, Saldo pendiente), y reemplazar el donut de ingresos YTD por una lista limpia y sin tarjeta de análisis por departamento. Sin cambios de datos, de lógica de analítica ni de base de datos.

**Architecture:** Cambio puramente de layout y jerarquía. `PulsoSection` pasa de una grilla de 4 `HeroKpi` iguales a un layout de 1 hero + 3 de apoyo: el hero sigue siendo `HeroKpi` (con un nuevo prop `size="lg"` para agrandarlo), y los tres de apoyo usan `HeroKpi` con `size="sm"` (número más chico, tarjeta más liviana). La gráfica de ingresos de 12 meses no cambia. `AnalisisSection` reemplaza `RevenueDonut` por un componente nuevo `DepartmentBreakdownList` — una lista sin chrome de tarjeta, una fila por departamento con punto de color, nombre, ocupación % e ingresos YTD, separadas por `divide-y`. El cálculo de ocupación por departamento se compone en `dashboard-client.tsx` a partir de las funciones ya exportadas en `lib/analytics.ts` (`occupancyRate` por propiedad sobre la ventana YTD) — no se agrega lógica nueva a `lib/analytics.ts`. El componente `revenue-donut.tsx` queda sin uso y se elimina. `page.tsx` no cambia su interfaz de props.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, date-fns (`es`), recharts (solo para `OccupancyBarChart`, que se mantiene), componentes shadcn existentes (`Card`), tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación de cada tarea: `pnpm typecheck`, `pnpm exec eslint <archivos modificados>` y `pnpm build`. NO usar `pnpm lint` — lintea archivos generados con errores preexistentes. No hay infraestructura de tests unitarios en el proyecto; la verificación es typecheck + eslint + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `components/dashboard/hero-kpi.tsx` | Modificar | Agregar prop `size` (`"lg"` \| `"sm"`, default `"lg"`) que escala número, padding y tipografía. |
| `app/(admin)/dashboard/pulso-section.tsx` | Modificar | Recomponer la grilla de 4 KPIs en 1 hero grande + 3 de apoyo chicos. |
| `components/dashboard/department-breakdown-list.tsx` | Crear | Lista sin chrome: una fila por departamento con punto de color, nombre, ocupación %, ingresos YTD. |
| `app/(admin)/dashboard/dashboard-client.tsx` | Modificar | Componer los datos por departamento (ingresos YTD + ocupación YTD) y pasarlos a `AnalisisSection`. |
| `app/(admin)/dashboard/analisis-section.tsx` | Modificar | Reemplazar la `Card` del donut por `DepartmentBreakdownList`; ajustar el tipo de props. |
| `components/charts/revenue-donut.tsx` | Eliminar | Componente del donut, queda sin uso tras la Fase 3. |

`lib/analytics.ts` NO se modifica. `components/charts/occupancy-bar.tsx`, `components/charts/chart-config.ts`, `components/dashboard/secondary-kpi.tsx`, `components/dashboard/on-track-badge.tsx`, `components/dashboard/section-heading.tsx`, `components/dashboard/kpi-target-popover.tsx`, `app/(admin)/dashboard/detalles-section.tsx`, `app/(admin)/dashboard/filter-bar.tsx` y `app/(admin)/dashboard/page.tsx` NO cambian.

---

## Task 1: Agregar el prop `size` a `HeroKpi`

Esta tarea es retrocompatible: el default `size="lg"` mantiene el render actual idéntico, así que la app sigue compilando y funcionando exactamente igual hasta que la Task 2 use `size="sm"`.

**Files:**
- Modificar: `components/dashboard/hero-kpi.tsx`

- [ ] **Step 1: Reescribir `components/dashboard/hero-kpi.tsx`** con exactamente este contenido:

```tsx
"use client";

import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OnTrackBadge } from "./on-track-badge";
import type { TargetStatus } from "@/lib/analytics-targets";
import { cn } from "@/lib/utils";

export type HeroKpiSize = "lg" | "sm";

export type HeroKpiProps = {
  /** Spanish label, e.g. "Ingresos del mes". */
  label: string;
  /** Pre-formatted display value, e.g. "$2.430.000". Pass null when there is no data in scope. */
  value: string | null;
  /** Status chip — pass null to hide the chip entirely (e.g. for KPIs that don't track against a target). */
  status?: TargetStatus | null;
  /** Pre-formatted vs-target delta, e.g. "+12%" or "-8%". Hidden when null. */
  vsTarget?: string | null;
  /** Pre-formatted MoM delta, e.g. "+5,2%". Hidden when null. */
  momDelta?: string | null;
  /** Sign of the MoM delta — drives color. "positive" | "negative" | "neutral". */
  momDirection?: "positive" | "negative" | "neutral";
  /**
   * Visual weight. "lg" is the dashboard hero (big number, generous padding).
   * "sm" is a demoted supporting KPI (smaller number, lighter card). Default "lg".
   */
  size?: HeroKpiSize;
  /** When true, all values render as Skeletons. */
  loading?: boolean;
  /** Slot for the inline "Editar objetivo" trigger. Pass a button (typically the trigger of KpiTargetPopover). */
  editTarget?: React.ReactNode;
};

export function HeroKpi({
  label,
  value,
  status,
  vsTarget,
  momDelta,
  momDirection = "neutral",
  size = "lg",
  loading,
  editTarget,
}: HeroKpiProps) {
  const isEmpty = value === null && !loading;
  const isLg = size === "lg";

  return (
    <Card className={cn("h-full", !isLg && "bg-secondary/40 shadow-none")}>
      <CardContent
        className={cn(
          "flex flex-col min-w-0",
          isLg ? "p-5 md:p-6 gap-3" : "p-4 gap-2"
        )}
      >
        {/* Label */}
        <p
          className={cn(
            "font-medium text-muted-foreground",
            isLg ? "text-sm" : "text-xs"
          )}
        >
          {label}
        </p>

        {/* Big number */}
        <div className="min-w-0">
          {loading ? (
            <Skeleton
              className={cn(isLg ? "h-10 w-44 lg:h-12 lg:w-52" : "h-7 w-28")}
            />
          ) : isEmpty ? (
            <p
              className={cn(
                "font-semibold tracking-tight tabular-nums text-muted-foreground",
                isLg ? "text-4xl lg:text-5xl" : "text-xl lg:text-2xl"
              )}
            >
              —
            </p>
          ) : (
            <p
              className={cn(
                "font-semibold tracking-tight tabular-nums truncate",
                isLg ? "text-4xl lg:text-5xl" : "text-xl lg:text-2xl"
              )}
            >
              {value}
            </p>
          )}
        </div>

        {/* Status row: badge + vs-target delta + edit trigger */}
        <div className="flex items-center gap-2 flex-wrap min-h-[1.5rem]">
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : status ? (
            <OnTrackBadge status={status} />
          ) : null}
          {!loading && vsTarget ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {vsTarget}
            </span>
          ) : null}
          {editTarget ? <span className="ml-auto">{editTarget}</span> : null}
        </div>

        {/* MoM delta */}
        {loading ? (
          <Skeleton className="h-3 w-28" />
        ) : isEmpty ? (
          <p className="text-xs text-muted-foreground">Sin datos en el período</p>
        ) : momDelta ? (
          <p
            className={cn(
              "text-xs tabular-nums",
              momDirection === "positive" && "text-success",
              momDirection === "negative" && "text-destructive",
              momDirection === "neutral" && "text-muted-foreground"
            )}
          >
            {momDelta} vs. mes anterior
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">&nbsp;</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Default trigger for the inline target popover. Compose into HeroKpi via the
 * `editTarget` slot.
 */
export function EditTargetTrigger({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        className
      )}
    >
      <Pencil className="h-3 w-3" />
      Editar objetivo
    </button>
  );
}
```

Notas: el hero `lg` queda más grande que el original (`text-4xl lg:text-5xl` en vez de `text-3xl lg:text-4xl`) para acentuar la jerarquía. El `sm` usa `bg-secondary/40 shadow-none` para verse demotado/más liviano, sin borde fuerte. Todos los colores son tokens (`secondary`, `muted-foreground`, `success`, `destructive`); no hay hex hardcodeado.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → debe terminar sin errores.
  - `pnpm exec eslint components/dashboard/hero-kpi.tsx` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: como `PulsoSection` aún no pasa `size`, todos los KPIs siguen renderizando como `lg`; la app se ve casi igual (el número del hero es levemente más grande).

- [ ] **Step 3: Commit.**

```
git commit -m "feat(dashboard): HeroKpi admite tamaño lg/sm para jerarquía"
```

---

## Task 2: Recomponer `PulsoSection` en 1 hero + 3 KPIs de apoyo

**Files:**
- Modificar: `app/(admin)/dashboard/pulso-section.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/dashboard/pulso-section.tsx`** con exactamente este contenido:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { HeroKpi, EditTargetTrigger } from "@/components/dashboard/hero-kpi";
import { KpiTargetPopover } from "@/components/dashboard/kpi-target-popover";
import { RevenueLineChart } from "@/components/charts/revenue-line";
import { formatCurrency, formatPercent, type Currency } from "@/lib/format";
import type { CompareToTargetResult } from "@/lib/analytics-targets";
import type { ExchangeRate, MonthlyTarget, Property } from "@/types/supabase";

export type PulsoKpiData = {
  /** Raw value in ARS (or, for occupancy, 0..1). */
  value: number;
  /** May be null when this KPI doesn't track a target. */
  compare: CompareToTargetResult | null;
  /** MoM delta as a fraction, e.g. 0.12 for +12%. Null when not enough history. */
  momDelta: number | null;
};

export type PulsoSectionProps = {
  /** When true, the active filter scope yields no reservations. KPIs render as "—". */
  empty?: boolean;
  kpis: {
    revenue: PulsoKpiData;
    netProfit: PulsoKpiData;
    occupancy: PulsoKpiData;
    balance: PulsoKpiData;
  };
  chart: {
    data: Array<Record<string, string | number>>;
    properties: Property[];
    target: number | null;
  };
  targetEditor: {
    properties: Pick<Property, "id" | "name">[];
    targets: MonthlyTarget[];
    monthKey: string;
  };
  currency: Currency;
  rate: ExchangeRate;
};

function fmtMoney(value: number, currency: Currency, rate: ExchangeRate): string {
  // KPI displays drop decimals — financial dashboards don't need cents,
  // and full precision overflows the card at desktop widths.
  return formatCurrency(value, currency, rate, 0);
}

function fmtMomDelta(delta: number | null): {
  text: string | null;
  direction: "positive" | "negative" | "neutral";
} {
  if (delta === null) return { text: null, direction: "neutral" };
  if (delta === 0) return { text: "0,0%", direction: "neutral" };
  const abs = Math.abs(delta);
  const sign = delta > 0 ? "+" : "−";
  return {
    text: `${sign}${formatPercent(abs)}`,
    direction: delta > 0 ? "positive" : "negative",
  };
}

function fmtVsTarget(compare: CompareToTargetResult | null): string | null {
  if (!compare || compare.status === "no_target" || compare.pct === null) return null;
  const pct = compare.pct;
  if (!Number.isFinite(pct)) return null;
  const display = formatPercent(pct);
  return `${display} del objetivo${compare.paceTarget !== compare.target ? " (ritmo)" : ""}`;
}

export function PulsoSection({
  empty = false,
  kpis,
  chart,
  targetEditor,
  currency,
  rate,
}: PulsoSectionProps) {
  // Single popover edits both revenue and occupancy targets for the active scope.
  // Each KPI that tracks a target gets its own trigger that opens the same popover.
  const renderEditTrigger = () =>
    targetEditor.properties.length > 0 ? (
      <KpiTargetPopover
        properties={targetEditor.properties}
        targets={targetEditor.targets}
        monthKey={targetEditor.monthKey}
      >
        <EditTargetTrigger />
      </KpiTargetPopover>
    ) : null;

  const revenueMom = fmtMomDelta(kpis.revenue.momDelta);
  const profitMom = fmtMomDelta(kpis.netProfit.momDelta);
  const occMom = fmtMomDelta(kpis.occupancy.momDelta);

  return (
    <section className="space-y-5">
      <SectionHeading title="Pulso del mes" />

      {/* Jerarquía: 1 KPI hero grande arriba (ancho completo) + 3 KPIs de
          apoyo chicos en una fila debajo. En mobile los 3 de apoyo se apilan
          en una columna; desde sm en una fila de 3. */}
      <div className="space-y-3">
        <HeroKpi
          size="lg"
          label="Ingresos del mes"
          value={empty ? null : fmtMoney(kpis.revenue.value, currency, rate)}
          status={empty ? null : kpis.revenue.compare?.status ?? "no_target"}
          vsTarget={empty ? null : fmtVsTarget(kpis.revenue.compare)}
          momDelta={empty ? null : revenueMom.text}
          momDirection={revenueMom.direction}
          editTarget={renderEditTrigger()}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HeroKpi
            size="sm"
            label="Beneficio neto"
            value={empty ? null : fmtMoney(kpis.netProfit.value, currency, rate)}
            status={null}
            momDelta={empty ? null : profitMom.text}
            momDirection={profitMom.direction}
          />
          <HeroKpi
            size="sm"
            label="Ocupación promedio"
            value={empty ? null : formatPercent(kpis.occupancy.value)}
            status={empty ? null : kpis.occupancy.compare?.status ?? "no_target"}
            vsTarget={empty ? null : fmtVsTarget(kpis.occupancy.compare)}
            momDelta={empty ? null : occMom.text}
            momDirection={occMom.direction}
            editTarget={renderEditTrigger()}
          />
          <HeroKpi
            size="sm"
            label="Saldo pendiente"
            value={empty ? null : fmtMoney(kpis.balance.value, currency, rate)}
            status={null}
            momDelta={null}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Ingresos · últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueLineChart
            data={chart.data}
            properties={chart.properties}
            currency={currency}
            rate={rate}
            target={chart.target}
          />
        </CardContent>
      </Card>
    </section>
  );
}
```

Notas: el layout es apilado — el contenedor `space-y-3` pone el hero `lg` ocupando el ancho completo arriba y, debajo, un grid `grid-cols-1 sm:grid-cols-3` con los tres KPIs de apoyo. En mobile los tres de apoyo se apilan en una columna; desde `sm` van en una fila de 3. La gráfica de 12 meses sigue a ancho completo debajo. No se cambia ningún dato ni la lógica de los KPIs; solo el layout y el `size`.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint app/(admin)/dashboard/pulso-section.tsx` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: el Dashboard muestra un KPI grande de Ingresos del mes a ancho completo arriba y, en una fila debajo, tres KPIs chicos (Beneficio neto, Ocupación promedio, Saldo pendiente). La gráfica de 12 meses no cambia.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(dashboard): jerarquia de Pulso con un KPI hero y tres de apoyo"
```

---

## Task 3: Crear `DepartmentBreakdownList`

Lista sin chrome de tarjeta, una fila por departamento, filas separadas por `divide-y`.

**Files:**
- Crear: `components/dashboard/department-breakdown-list.tsx`

- [ ] **Step 1: Crear `components/dashboard/department-breakdown-list.tsx`** con exactamente este contenido:

```tsx
import { formatCurrency, formatPercent, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";

export type DepartmentBreakdownRow = {
  /** Department id — used as React key. */
  id: string;
  /** Department name, e.g. "Airbnb 1". */
  name: string;
  /** Color swatch hex, e.g. "#A47148". */
  color: string;
  /** YTD revenue in ARS. */
  revenueYtd: number;
  /** Occupancy over the YTD window as a fraction 0..1. */
  occupancy: number;
};

/**
 * Lista sin chrome de tarjeta para "Análisis por departamento".
 * Una fila por departamento: punto de color, nombre, ocupación % e ingresos YTD.
 * Filas separadas por divisores finos (divide-y). Reemplaza al donut.
 */
export function DepartmentBreakdownList({
  rows,
  currency,
  rate,
}: {
  rows: DepartmentBreakdownRow[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  const hasData = rows.some((r) => r.revenueYtd > 0);

  if (rows.length === 0 || !hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {row.name}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatPercent(row.occupancy)}
          </span>
          <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums">
            {formatCurrency(row.revenueYtd, currency, rate, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

Notas: `formatPercent` espera una fracción 0..1 (igual que la ocupación que se usa en `PulsoSection`), por eso `occupancy` se documenta como fracción. El color viene como hex del departamento (`color_hex` o el fallback `#A47148` que ya produce `revenueByPropertyYTD`). No hay tarjeta ni borde alrededor; solo `divide-y divide-border` entre filas.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores (el componente todavía no se usa, pero debe compilar).
  - `pnpm exec eslint components/dashboard/department-breakdown-list.tsx` → sin errores ni warnings.
  - Esperado: el archivo compila; aún no aparece en pantalla.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(dashboard): lista de analisis por departamento sin chrome"
```

---

## Task 4: Componer los datos por departamento en `dashboard-client.tsx`

Se reemplaza el dato `ytdByProperty` (formato donut) por `departmentBreakdown` (formato lista). La ocupación por departamento se compone con `occupancyRate` ya exportada, sobre la misma ventana YTD (inicio de año → hoy) que ya usaba el donut. No se agrega lógica a `lib/analytics.ts`.

**Files:**
- Modificar: `app/(admin)/dashboard/dashboard-client.tsx`

- [ ] **Step 1: Reemplazar el bloque `ytdByProperty`.** Buscar exactamente:

```tsx
  // YTD revenue donut data.
  const ytdByProperty = useMemo(
    () => revenueByPropertyYTD(filteredRes, filteredProps),
    [filteredRes, filteredProps]
  );
```

Reemplazarlo por:

```tsx
  // Datos por departamento para la lista de "Análisis por departamento":
  // ingresos YTD (de revenueByPropertyYTD) + ocupación YTD (occupancyRate por
  // propiedad sobre la misma ventana inicio-de-año → hoy). Composición de
  // funciones ya existentes; no se agrega lógica a lib/analytics.ts.
  const departmentBreakdown = useMemo(() => {
    const ytdFrom = startOfYear(new Date());
    const ytdTo = endOfDay(new Date());
    const revenueRows = revenueByPropertyYTD(filteredRes, filteredProps);
    return filteredProps.map((p) => {
      const revRow = revenueRows.find((r) => r.name === p.name);
      return {
        id: p.id,
        name: p.name,
        color: p.color_hex ?? "#A47148",
        revenueYtd: revRow?.value ?? 0,
        occupancy: occupancyRate(
          filteredRes.filter((r) => r.property_id === p.id),
          [p],
          ytdFrom,
          ytdTo
        ),
      };
    });
  }, [filteredRes, filteredProps]);
```

- [ ] **Step 2: Quitar el import sin uso `revenueByPropertyYTD` no se quita** — sigue usándose dentro de `departmentBreakdown`. NO tocar el bloque de imports de `@/lib/analytics`; `occupancyRate` y `revenueByPropertyYTD` ya están importados (ver líneas 13-22 del archivo). Confirmar que ambos siguen en la lista de imports.

- [ ] **Step 3: Actualizar el render de `<AnalisisSection>`.** Buscar exactamente:

```tsx
      <AnalisisSection
        occupancy={{
          data: monthlyOcc,
          properties: filteredProps,
        }}
        donut={{
          data: ytdByProperty,
        }}
        currency={filters.currency}
        rate={rate}
      />
```

Reemplazarlo por:

```tsx
      <AnalisisSection
        occupancy={{
          data: monthlyOcc,
          properties: filteredProps,
        }}
        breakdown={departmentBreakdown}
        currency={filters.currency}
        rate={rate}
      />
```

Notas: este Step deja `dashboard-client.tsx` referenciando un prop `breakdown` que `AnalisisSection` todavía no acepta — `pnpm typecheck` fallará hasta completar la Task 5. Por eso las Tasks 4 y 5 se verifican juntas al final de la Task 5. Ejecutar igualmente `pnpm exec eslint` sobre el archivo en este punto para detectar errores de sintaxis, pero el typecheck/build se valida tras la Task 5.

- [ ] **Step 4: NO hacer commit todavía.** La app no compila entre la Task 4 y la Task 5. El commit se hace al final de la Task 5.

---

## Task 5: Cambiar `AnalisisSection` para usar la lista en lugar del donut

**Files:**
- Modificar: `app/(admin)/dashboard/analisis-section.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/dashboard/analisis-section.tsx`** con exactamente este contenido:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { OccupancyBarChart } from "@/components/charts/occupancy-bar";
import {
  DepartmentBreakdownList,
  type DepartmentBreakdownRow,
} from "@/components/dashboard/department-breakdown-list";
import { type Currency } from "@/lib/format";
import type { ExchangeRate, Property } from "@/types/supabase";

export type AnalisisSectionProps = {
  occupancy: {
    data: Array<Record<string, string | number>>;
    properties: Property[];
  };
  /** Una fila por departamento: ingresos YTD + ocupación YTD. */
  breakdown: DepartmentBreakdownRow[];
  currency: Currency;
  rate: ExchangeRate;
};

export function AnalisisSection({
  occupancy,
  breakdown,
  currency,
  rate,
}: AnalisisSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading title="Análisis por departamento" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Ocupación mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyBarChart
              data={occupancy.data}
              properties={occupancy.properties}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Ingresos por departamento (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentBreakdownList
              rows={breakdown}
              currency={currency}
              rate={rate}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
```

Notas: el `SectionHeading` cambia de "Análisis por propiedad" a "Análisis por departamento" (terminología pedida por el spec). La lista vive dentro de una `Card` solo para alinear visualmente con la `Card` de la gráfica de ocupación al lado; el componente `DepartmentBreakdownList` en sí no agrega chrome — son sus filas las que van sin tarjeta, separadas por `divide-y`. La columna de la gráfica de ocupación no cambia.

- [ ] **Step 2: Verificar (cierra Tasks 4 y 5).** Ejecutar:
  - `pnpm typecheck` → sin errores (ya no hay prop `donut` huérfano).
  - `pnpm exec eslint "app/(admin)/dashboard/dashboard-client.tsx" "app/(admin)/dashboard/analisis-section.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: la sección "Análisis por departamento" muestra a la izquierda la gráfica de ocupación mensual y a la derecha una lista con cuatro filas (Airbnb 1..4), cada una con punto de color, nombre, ocupación % e ingresos YTD; sin donut.

- [ ] **Step 3: Commit (cierra Tasks 4 y 5).**

```
git commit -m "feat(dashboard): reemplazar donut YTD por lista de departamentos"
```

---

## Task 6: Eliminar `revenue-donut.tsx` y verificar limpieza de colores

Tras la Task 5, `revenue-donut.tsx` queda sin uso. Antes de borrarlo, confirmar que ningún otro archivo lo importa.

**Files:**
- Eliminar: `components/charts/revenue-donut.tsx`

- [ ] **Step 1: Confirmar que nada importa el donut.** Buscar en el repo las cadenas `revenue-donut` y `RevenueDonut`. El único resultado en código fuente (`.ts`/`.tsx`) debe ser el propio archivo `components/charts/revenue-donut.tsx`. Los resultados dentro de `.design/` son documentos de diseño y no cuentan. Si aparece cualquier otro `import`, detenerse y reportarlo en lugar de borrar.

- [ ] **Step 2: Eliminar el archivo** `components/charts/revenue-donut.tsx`.

- [ ] **Step 3: Revisar colores hardcodeados en los archivos del dashboard tocados.** Revisar `app/(admin)/dashboard/pulso-section.tsx`, `app/(admin)/dashboard/analisis-section.tsx`, `app/(admin)/dashboard/dashboard-client.tsx`, `components/dashboard/hero-kpi.tsx` y `components/dashboard/department-breakdown-list.tsx`. El único hex permitido es el fallback `"#A47148"` en `dashboard-client.tsx` (`p.color_hex ?? "#A47148"`) y en `department-breakdown-list.tsx` (vía el dato `color`), que ya es el patrón usado por `revenueByPropertyYTD` en `lib/analytics.ts` para departamentos sin color asignado — se conserva por consistencia con la lógica existente. Cualquier otro color de Tailwind o hex literal debe pasar a tokens (`bg-secondary`, `text-muted-foreground`, `divide-border`, etc.). Tras la revisión, confirmar que no hay otros colores hardcodeados; no debería hacer falta editar nada.

- [ ] **Step 4: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores (confirma que nada quedó importando el donut).
  - `pnpm exec eslint "components/**/*.tsx" "app/(admin)/dashboard/**/*.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: el build pasa sin el archivo del donut.

- [ ] **Step 5: Commit.**

```
git commit -m "chore(dashboard): eliminar componente revenue-donut sin uso"
```

---

## Verificación final de la Fase 3

- [ ] `pnpm typecheck` termina sin errores.
- [ ] `pnpm exec eslint "app/(admin)/dashboard/**/*.tsx" "components/dashboard/**/*.tsx" "components/charts/**/*.tsx"` termina sin errores ni warnings.
- [ ] `pnpm build` termina exitosamente.
- [ ] Revisión visual del Dashboard (`/dashboard`):
  - "Pulso del mes": un KPI hero grande (Ingresos del mes) con su badge de objetivo, el delta MoM y el editor de objetivo; tres KPIs de apoyo más chicos y demotados (Beneficio neto, Ocupación promedio, Saldo pendiente).
  - Se mantiene la única gráfica de ingresos de 12 meses con la línea de objetivo.
  - "Análisis por departamento": a la izquierda la gráfica de barras de ocupación mensual; a la derecha una lista sin tarjeta, una fila por departamento (Airbnb 1..4), con punto de color, nombre, ocupación % e ingresos YTD, separadas por divisores finos. Sin donut.
  - Probar los filtros (rango de tiempo, moneda, propiedades): la lista de departamentos refleja la selección de propiedades; los importes cambian de moneda.
  - Estado vacío: con una selección sin reservas, los KPIs muestran "—" y la lista muestra "Sin datos para el período seleccionado".
- [ ] Sin `revenue-donut.tsx` en el repo; ningún import roto.
- [ ] Spanish rioplatense, sin emojis ni signos de exclamación en la UI.
