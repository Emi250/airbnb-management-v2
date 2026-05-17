# Rediseño Refugio del Corazón — Fase 4B: Gastos y Reportes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la jerarquía visual y de layout de las páginas de **Gastos** y **Reportes**. En Gastos: dejar el KPI del mes (total + tendencia MoM) claramente arriba; rebalancear el donut y la grilla de categorías con un layout de 2 columnas consistente con la `AnalisisSection` del dashboard rediseñado (donut en una `Card`, desglose de categorías en otra); sacar el checklist de gastos fijos del medio de la página (hoy interrumpe el flujo KPI→historial) y darle su propio bloque claramente separado debajo del historial; y conectar visualmente la tabla de historial con el donut agregando un punto de color de categoría por fila. En Reportes: subir los "Pagos pendientes" al frente con una tarjeta destacada cerca del tope; agrupar las 7 tarjetas de exportación en dos grupos etiquetados ("Operativos" y "Contables"); y eliminar la tabla de vista previa redundante del final (duplica datos ya disponibles vía la exportación "reservas detalladas"). Sin features nuevas, sin cambios de lógica de negocio, sin cambios de base de datos y sin tocar la lógica de exportación CSV.

**Architecture:** Cambio puramente de layout, jerarquía e interacción client-side. Ningún archivo nuevo: se reescriben `expenses-view.tsx` y `reports-client.tsx`, y se hace una edición mínima en `fixed-checklist.tsx` (sólo el `CardTitle`, para que el bloque, ahora separado, tenga un encabezado autoexplicativo). En **Gastos**, el JSX se reordena: barra de filtros → KPI del mes → grilla de 2 columnas (donut | desglose de categorías) → historial de gastos → checklist de gastos fijos como bloque final separado por un `SectionHeading`. El desglose de categorías deja de ser una grilla de mini-`Card`s y pasa a ser una lista sin chrome con divisores (`divide-y`), siguiendo el patrón de `DepartmentBreakdownList`; la tabla de historial gana una celda inicial con punto de color usando `EXPENSE_CATEGORY_COLOR`. En **Reportes**, `summary.pending` ya se calcula; se agrega una tarjeta destacada de "Pagos pendientes" debajo de los filtros que muestra esa cifra y dispara `exportPending`; las `reportCards` se parten en dos arreglos (`operativos` y `contables`) renderizados bajo encabezados; se elimina el componente `PreviewTable` y su `Card` contenedora. La lógica de cálculo (`summary`, `filteredReservations`, todas las funciones `export*`, `downloadCsv`) queda intacta. `expenses/page.tsx` y `reports/page.tsx` no cambian su interfaz de props ni sus queries.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, recharts, date-fns (`es`), componentes shadcn existentes (`Card`, `Table`, `Button`, `Input`, `Label`, `Select`, `Dialog`, `Textarea`), `ExpenseDonut` y `EXPENSE_CATEGORY_COLOR` de `components/charts/expense-donut.tsx`, `SectionHeading` de `components/dashboard/section-heading.tsx`, helpers de `lib/format.ts`, `EXPENSE_CATEGORY_LABEL`/`SOURCE_LABEL`/`STATUS_LABEL` de `lib/reservation-options.ts`, tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación de cada tarea: `pnpm typecheck`, `pnpm exec eslint <archivos modificados>` y `pnpm build`. NO usar `pnpm lint` — lintea archivos generados con errores preexistentes. No hay infraestructura de tests unitarios en el proyecto; la verificación es typecheck + eslint + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `app/(admin)/expenses/expenses-view.tsx` | Modificar | Reordenar la jerarquía: KPI arriba, grilla de 2 columnas (donut \| desglose de categorías), historial con punto de color por fila, checklist de gastos fijos como bloque final separado. |
| `app/(admin)/expenses/fixed-checklist.tsx` | Modificar | Sólo el `CardTitle`: agregar un encabezado autoexplicativo ahora que el bloque está separado del resto de la página. |
| `app/(admin)/reports/reports-client.tsx` | Modificar | Tarjeta destacada de "Pagos pendientes" cerca del tope; agrupar las tarjetas de exportación en "Operativos" y "Contables"; eliminar la tabla de vista previa redundante. |

`app/(admin)/expenses/page.tsx`, `app/(admin)/reports/page.tsx`, `app/(admin)/reports/reports-kpis.tsx`, `app/(admin)/reports/reports-filters.tsx`, `app/(admin)/reports/reports-trend-chart.tsx`, `app/(admin)/reports/reports-utils.ts`, `components/page-header.tsx`, `components/charts/expense-donut.tsx`, `components/charts/chart-config.ts`, `components/dashboard/section-heading.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `lib/format.ts` y `lib/reservation-options.ts` NO se modifican.

---

## Task 1: Gastos — KPI arriba, grilla de 2 columnas y desglose de categorías como lista

`ExpensesView` reordena su JSX para que la jerarquía sea: barra de filtros → KPI del mes → grilla de 2 columnas (donut a la izquierda, desglose de categorías a la derecha). El desglose de categorías deja de ser una grilla de mini-`Card`s desbalanceada y pasa a ser una lista sin chrome con divisores, dentro de su propia `Card`, replicando el patrón de `DepartmentBreakdownList` del dashboard. En esta misma tarea se mueve el `FixedChecklist` fuera del medio: pasa a ser el último bloque de la página, debajo del historial, separado por un `SectionHeading`. La tabla de historial gana un punto de color de categoría por fila para conectarla visualmente con el donut. La lógica (`useMemo` de totales, `filter`, formulario de alta, `onDelete`) no cambia.

**Decisión de layout (Gastos):** se adopta exactamente el patrón de `AnalisisSection`: `<div className="grid gap-4 lg:grid-cols-2">` con dos `Card`s de igual peso. Izquierda: `Card` "Composición de egresos" con el `ExpenseDonut`. Derecha: `Card` "Desglose por categoría" con una lista `divide-y` — una fila por categoría con punto de color, etiqueta, barra de progreso fina, porcentaje e importe. Esto reemplaza la grilla `lg:grid-cols-3` actual (donut 1/3 + 7 mini-`Card`s 2/3) que se ve desbalanceada. El checklist de gastos fijos se mueve al final de la página (después del historial), introducido por `<SectionHeading title="Gastos fijos del mes" />`, de modo que el flujo KPI → composición → historial no se interrumpe.

**Files:**
- Modificar: `app/(admin)/expenses/expenses-view.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/expenses/expenses-view.tsx`** con exactamente este contenido:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  RotateCcw,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import { formatCurrency, formatDateShort, formatPercent } from "@/lib/format";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/reservation-options";
import { cn } from "@/lib/utils";
import {
  ExpenseDonut,
  EXPENSE_CATEGORY_COLOR,
} from "@/components/charts/expense-donut";
import { FixedChecklist } from "./fixed-checklist";
import { createExpenseAction, deleteExpenseAction } from "./actions";
import type {
  Property,
  ExpenseCategory,
  FixedExpenseItem,
  FixedExpenseCheck,
} from "@/types/supabase";

type ExpenseRow = {
  id: string;
  property_id: string | null;
  date: string;
  category: string;
  amount_ars: number;
  description: string | null;
  property: { name: string; color_hex: string | null } | null;
};

const GENERAL_SENTINEL = "__general__";
const ALL_MONTHS = "all";

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2024, i, 1), "MMMM", { locale: es })
);

type Filter = { year: number; month: number | typeof ALL_MONTHS };

export function ExpensesView({
  expenses,
  properties,
  fixedItems,
  fixedChecks,
}: {
  expenses: ExpenseRow[];
  properties: Property[];
  fixedItems: FixedExpenseItem[];
  fixedChecks: (FixedExpenseCheck & { amount_ars?: number })[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = useMemo(() => new Date(), []);
  const defaultFilter: Filter = useMemo(
    () => ({ year: today.getFullYear(), month: today.getMonth() + 1 }),
    [today]
  );
  const [filter, setFilter] = useState<Filter>(defaultFilter);

  const availableYears = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);
    for (const e of expenses) {
      const y = parseISO(e.date).getFullYear();
      if (Number.isFinite(y)) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, today]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = parseISO(e.date);
      if (d.getFullYear() !== filter.year) return false;
      if (filter.month !== ALL_MONTHS && d.getMonth() + 1 !== filter.month)
        return false;
      return true;
    });
  }, [expenses, filter]);

  const totalsByCategory = useMemo(() => {
    return filteredExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount_ars);
      return acc;
    }, {});
  }, [filteredExpenses]);
  const totalAll = useMemo(
    () => Object.values(totalsByCategory).reduce((a, b) => a + b, 0),
    [totalsByCategory]
  );

  const previousTotal = useMemo(() => {
    let prevYear = filter.year;
    let prevMonth: number | typeof ALL_MONTHS;
    if (filter.month === ALL_MONTHS) {
      prevYear = filter.year - 1;
      prevMonth = ALL_MONTHS;
    } else {
      prevMonth = filter.month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = filter.year - 1;
      }
    }
    return expenses.reduce((acc, e) => {
      const d = parseISO(e.date);
      if (d.getFullYear() !== prevYear) return acc;
      if (prevMonth !== ALL_MONTHS && d.getMonth() + 1 !== prevMonth) return acc;
      return acc + Number(e.amount_ars);
    }, 0);
  }, [expenses, filter]);

  const delta =
    previousTotal > 0 ? (totalAll - previousTotal) / previousTotal : null;

  const periodLabel = useMemo(() => {
    if (filter.month === ALL_MONTHS) return `Año ${filter.year}`;
    const d = new Date(filter.year, filter.month - 1, 1);
    return format(d, "MMMM yyyy", { locale: es });
  }, [filter]);

  const checklistPeriod = useMemo(() => {
    const month = filter.month === ALL_MONTHS ? today.getMonth() + 1 : filter.month;
    const year = filter.month === ALL_MONTHS ? today.getFullYear() : filter.year;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [filter, today]);

  const filteredChecks = useMemo(
    () => fixedChecks.filter((c) => c.period === checklistPeriod),
    [fixedChecks, checklistPeriod]
  );

  const isDefaultFilter =
    filter.year === defaultFilter.year && filter.month === defaultFilter.month;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: "cleaning",
      amount_ars: 0,
      property_id: null,
      description: "",
    },
  });

  function onSubmit(values: ExpenseInput) {
    startTransition(async () => {
      const r = await createExpenseAction(values);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Gasto registrado");
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    startTransition(async () => {
      const r = await deleteExpenseAction(id);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Gasto eliminado");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Barra de filtros + acción de alta. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Año</Label>
          <Select
            value={String(filter.year)}
            onValueChange={(v) => setFilter((f) => ({ ...f, year: Number(v) }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mes</Label>
          <Select
            value={filter.month === ALL_MONTHS ? ALL_MONTHS : String(filter.month)}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                month: v === ALL_MONTHS ? ALL_MONTHS : Number(v),
              }))
            }
          >
            <SelectTrigger className="w-[170px] capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>Todo el año</SelectItem>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)} className="capitalize">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setFilter(defaultFilter)}
          disabled={isDefaultFilter}
        >
          <RotateCcw className="h-4 w-4" />
          Restablecer filtros
        </Button>
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar gasto
          </Button>
        </div>
      </div>

      {/* KPI del mes — total + tendencia MoM, claramente arriba. */}
      <Card className="border-2">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Gasto Total
              </p>
              <p className="text-sm capitalize text-muted-foreground">
                {periodLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="numeric text-3xl font-semibold sm:text-4xl">
              {formatCurrency(totalAll)}
            </p>
            {delta !== null && (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-xs",
                  delta >= 0 ? "text-destructive" : "text-emerald-500"
                )}
              >
                {delta >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(Math.abs(delta))} vs período anterior
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Composición de egresos — grilla de 2 columnas balanceada
          (donut | desglose por categoría), patrón de AnalisisSection. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Composición de egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseDonut totalsByCategory={totalsByCategory} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Desglose por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalAll === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay gastos en el período seleccionado.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {Object.entries(EXPENSE_CATEGORY_LABEL)
                  .map(([cat, label]) => {
                    const total = totalsByCategory[cat] ?? 0;
                    const pct = totalAll > 0 ? total / totalAll : 0;
                    const color =
                      EXPENSE_CATEGORY_COLOR[cat as ExpenseCategory] ?? "#94a3b8";
                    return { cat, label, total, pct, color };
                  })
                  .sort((a, b) => b.total - a.total)
                  .map(({ cat, label, total, pct, color }) => (
                    <li key={cat} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {label}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatPercent(pct)}
                        </span>
                        <span className="numeric w-32 shrink-0 text-right text-sm font-medium">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div className="mt-2 ml-[1.375rem] h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct * 100, total > 0 ? 2 : 0)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de gastos — con punto de color de categoría por fila
          para conectarlo visualmente con el donut. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay gastos en el período seleccionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((e) => {
                  const catColor =
                    EXPENSE_CATEGORY_COLOR[e.category as ExpenseCategory] ??
                    "#94a3b8";
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{formatDateShort(e.date)}</TableCell>
                      <TableCell>
                        {e.property ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: e.property.color_hex ?? "#A47148",
                              }}
                            />
                            {e.property.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: catColor }}
                            aria-hidden
                          />
                          {EXPENSE_CATEGORY_LABEL[e.category as ExpenseCategory] ??
                            e.category}
                        </span>
                      </TableCell>
                      <TableCell>{e.description ?? "—"}</TableCell>
                      <TableCell className="numeric text-right">
                        {formatCurrency(e.amount_ars)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(e.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gastos fijos — bloque final, separado del flujo KPI→historial. */}
      <section className="space-y-4 pt-2">
        <SectionHeading
          title="Gastos fijos del mes"
          subtitle="Checklist de gastos recurrentes a pagar en el período."
        />
        <FixedChecklist
          items={fixedItems}
          checks={filteredChecks}
          period={checklistPeriod}
        />
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-2">
                <Label>Importe *</Label>
                <Input type="number" step="0.01" {...register("amount_ars")} />
              </div>
              <div className="space-y-2">
                <Label>Propiedad</Label>
                <Controller
                  control={control}
                  name="property_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? GENERAL_SENTINEL}
                      onValueChange={(v) =>
                        field.onChange(v === GENERAL_SENTINEL ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="General" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GENERAL_SENTINEL}>General</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXPENSE_CATEGORY_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea {...register("description")} rows={2} />
            </div>
            {errors.amount_ars && (
              <p className="text-xs text-destructive">{errors.amount_ars.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Notas: el orden de bloques pasa a ser **filtros → KPI → composición (2 columnas) → historial → gastos fijos**. El KPI no cambió de markup, sólo de posición relativa (ya estaba arriba; el `FixedChecklist` se sacó del medio). La grilla `lg:grid-cols-3` con donut + 7 mini-`Card`s se reemplaza por `grid lg:grid-cols-2` con dos `Card`s de igual peso, igual que `AnalisisSection`. El desglose por categoría deja de ser mini-`Card`s y pasa a una lista `divide-y` ordenada de mayor a menor importe, con la barra de progreso indentada (`ml-[1.375rem]`) para alinearla bajo la etiqueta. La altura del donut sube de `240` a `260` para llenar mejor la `Card`. El historial gana una columna interna: la celda "Categoría" ahora muestra un punto de color (`EXPENSE_CATEGORY_COLOR`) antes de la etiqueta, conectándola visualmente con el donut. El `FixedChecklist` se monta al final, dentro de una `<section>` con `SectionHeading`. Los hex `#94a3b8` (fallback de categoría, ya presente en `expense-donut.tsx`) y `#A47148` (fallback de propiedad, ya presente en el original) se mantienen como fallbacks; no se introduce ningún color hardcodeado nuevo. La lógica de datos, el formulario de alta y `onDelete` son idénticos al original.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/expenses/expenses-view.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/expenses` la página muestra, de arriba abajo: filtros, KPI del mes, una grilla de 2 columnas (donut a la izquierda, lista de categorías a la derecha), la tabla de historial con un punto de color por categoría en cada fila, y al final el checklist de gastos fijos bajo el encabezado "Gastos fijos del mes". El checklist ya no aparece entre el KPI y el historial.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(expenses): KPI arriba, grilla 2 columnas y checklist al final"
```

---

## Task 2: Gastos — encabezado autoexplicativo del checklist de gastos fijos

Ahora que `FixedChecklist` es un bloque final separado por un `SectionHeading` ("Gastos fijos del mes"), su `CardTitle` interno "Gastos fijos · {mes}" es redundante con ese encabezado. Se ajusta el `CardTitle` para que el bloque siga siendo autoexplicativo sin duplicar la palabra "Gastos fijos": pasa a mostrar sólo el período (mes y año) como título de la `Card`. La lógica del componente (marcar/desmarcar pagos, agregar/quitar ítems, diálogo de pago) no cambia.

**Files:**
- Modificar: `app/(admin)/expenses/fixed-checklist.tsx`

- [ ] **Step 1: Editar `app/(admin)/expenses/fixed-checklist.tsx`.** Reemplazar exactamente este bloque:

```tsx
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="capitalize">Gastos fijos · {periodLabel}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {paidCount}/{totalCount} pagados este mes
          </p>
        </div>
      </CardHeader>
```

por:

```tsx
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-medium capitalize">
            {periodLabel}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {paidCount}/{totalCount} pagados este mes
          </p>
        </div>
      </CardHeader>
```

Notas: el `SectionHeading` de la Task 1 ya dice "Gastos fijos del mes", así que el `CardTitle` deja de repetir "Gastos fijos ·" y muestra sólo el período (`periodLabel`, ej. "mayo 2026"). Se añade `text-base font-medium` para alinear el tamaño de tipografía con los `CardTitle` del resto de la página rediseñada (donut, desglose, historial). El resto del componente —incluida la variable `periodLabel`, ya calculada arriba— no se toca.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/expenses/fixed-checklist.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/expenses`, el bloque final muestra el encabezado "Gastos fijos del mes" (del `SectionHeading`) y, dentro de la `Card`, el título es sólo el período (ej. "mayo 2026") con el contador "X/Y pagados este mes" debajo.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(expenses): titulo del checklist sin duplicar el encabezado de seccion"
```

---

## Task 3: Reportes — destacar "Pagos pendientes" y agrupar las tarjetas de exportación

`ReportsClient` recibe dos cambios de jerarquía: (1) una tarjeta destacada de "Pagos pendientes" justo debajo de los filtros, que muestra la cifra `summary.pending` (ya calculada) con la cantidad de reservas con saldo y un botón que dispara `exportPending`; (2) las 7 tarjetas de exportación, hoy una grilla plana de peso igual, se parten en dos grupos etiquetados: **"Operativos"** y **"Contables"**. La lógica de cálculo (`summary`, `filteredReservations`) y todas las funciones `export*` quedan idénticas.

**Decisión de agrupación de tarjetas (Reportes):** leyendo la lista real de `reportCards`, el corte es por uso. **Operativos** (gestión del día a día: coordinar huéspedes, cobrar, medir ocupación): `guests` (Lista de huéspedes), `reservations` (Reservas detalladas), `pending` (Saldos pendientes), `occupancy` (Ocupación y ADR). **Contables** (cierre y análisis de ingresos para administración/contador): `consolidated` (Ingresos por propiedad), `source` (Ingresos por canal), `fiscal` (Reporte fiscal). La tarjeta `pending` se mantiene también en el grupo Operativos porque sigue siendo una descarga válida; la tarjeta destacada del tope es el atajo visible, no la reemplaza.

**Decisión del bloque "Pagos pendientes":** no se crea un componente nuevo ni se cambia el cálculo. Se reusa `summary.pending` (ya derivado de `filteredReservations`). La cantidad de reservas con saldo se calcula inline en el render con un `filter` sobre `filteredReservations` (mismo predicado que ya usa `exportPending`). El bloque se renderiza sólo cuando `summary.pending > 0`; si está todo cobrado no se muestra, evitando una tarjeta vacía. El botón del bloque llama a `exportPending`, la misma función ya existente.

**Files:**
- Modificar: `app/(admin)/reports/reports-client.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/reports/reports-client.tsx`** con exactamente este contenido:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Download,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/reservation-options";
import type {
  Property,
  ReservationSource,
  ReservationStatus,
} from "@/types/supabase";
import {
  ReportsFilters,
  type ReportsFiltersState,
} from "./reports-filters";
import { ReportsKpis, type KpiSummary } from "./reports-kpis";
import { ReportsTrendChart } from "./reports-trend-chart";
import {
  daysInRange,
  defaultRange,
  downloadCsv,
  overlapNights,
} from "./reports-utils";

type ReservationRow = {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: ReservationSource;
  status: ReservationStatus;
  nights: number;
  property: { name: string; color_hex: string | null } | null;
  guest: { name: string; country: string | null; phone: string | null } | null;
};

type ExpenseRow = {
  id: string;
  property_id: string | null;
  date: string;
  category: string;
  amount_ars: number;
  description: string | null;
  property: { name: string } | null;
};

export function ReportsClient({
  reservations,
  properties,
  expenses,
}: {
  reservations: ReservationRow[];
  properties: Property[];
  expenses: ExpenseRow[];
}) {
  const [filters, setFilters] = useState<ReportsFiltersState>(() => {
    const r = defaultRange();
    return { from: r.from, to: r.to, propertyIds: [] };
  });

  const filteredProperties = useMemo(
    () =>
      filters.propertyIds.length === 0
        ? properties
        : properties.filter((p) => filters.propertyIds.includes(p.id)),
    [properties, filters.propertyIds]
  );

  const filteredReservations = useMemo(
    () =>
      reservations.filter((r) => {
        if (r.status === "cancelled") return false;
        if (
          filters.propertyIds.length > 0 &&
          !filters.propertyIds.includes(r.property_id)
        )
          return false;
        return r.check_in >= filters.from && r.check_in <= filters.to;
      }),
    [reservations, filters]
  );

  const summary: KpiSummary = useMemo(() => {
    const totalRevenue = filteredReservations.reduce(
      (a, r) => a + Number(r.total_amount_ars),
      0
    );
    const paid = filteredReservations.reduce(
      (a, r) => a + Number(r.amount_paid_ars),
      0
    );
    const pending = Math.max(0, totalRevenue - paid);

    const occupiedNights = filteredReservations.reduce(
      (a, r) =>
        a + overlapNights(r.check_in, r.check_out, filters.from, filters.to),
      0
    );
    const days = daysInRange(filters.from, filters.to);
    const availableNights = days * filteredProperties.length;

    return {
      reservationCount: filteredReservations.length,
      totalRevenue,
      paid,
      pending,
      occupiedNights,
      availableNights,
    };
  }, [filteredReservations, filteredProperties.length, filters.from, filters.to]);

  // Reservas con saldo a cobrar — mismo predicado que usa exportPending.
  const pendingCount = useMemo(
    () =>
      filteredReservations.filter(
        (r) => Number(r.total_amount_ars) - Number(r.amount_paid_ars) > 0
      ).length,
    [filteredReservations]
  );

  const rangeSlug = `${filters.from}_${filters.to}`;

  // ---------- exports ----------
  function exportReservations() {
    downloadCsv(
      `reservas-detalladas-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Huésped",
        "Check-in",
        "Check-out",
        "Noches",
        "Huéspedes",
        "Total ARS",
        "Pagado ARS",
        "Saldo ARS",
        "Canal",
        "Estado",
      ],
      filteredReservations.map((r) => [
        r.property?.name ?? "",
        r.guest?.name ?? "",
        r.check_in,
        r.check_out,
        r.nights,
        r.num_guests,
        r.total_amount_ars,
        r.amount_paid_ars,
        Number(r.total_amount_ars) - Number(r.amount_paid_ars),
        SOURCE_LABEL[r.source] ?? r.source,
        STATUS_LABEL[r.status] ?? r.status,
      ])
    );
  }

  function exportGuestList() {
    const rows = filteredReservations
      .slice()
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .map((r) => [
        r.check_in,
        r.check_out,
        r.guest?.name ?? "",
        r.guest?.country ?? "",
        r.guest?.phone ?? "",
        r.num_guests,
        r.property?.name ?? "",
      ]);
    downloadCsv(
      `lista-huespedes-${rangeSlug}.csv`,
      [
        "Check-in",
        "Check-out",
        "Nombre",
        "País",
        "Teléfono",
        "Huéspedes",
        "Propiedad",
      ],
      rows
    );
  }

  function exportConsolidated() {
    const rows = properties
      .filter(
        (p) =>
          filters.propertyIds.length === 0 || filters.propertyIds.includes(p.id)
      )
      .map((p) => {
        const list = filteredReservations.filter((r) => r.property_id === p.id);
        const revenue = list.reduce(
          (a, r) => a + Number(r.total_amount_ars),
          0
        );
        const paid = list.reduce((a, r) => a + Number(r.amount_paid_ars), 0);
        return [p.name, list.length, revenue, paid, revenue - paid];
      });
    downloadCsv(
      `ingresos-consolidados-${rangeSlug}.csv`,
      ["Propiedad", "Reservas", "Total ARS", "Pagado ARS", "Saldo ARS"],
      rows
    );
  }

  function exportBySource() {
    const totals = new Map<ReservationSource, { count: number; total: number }>();
    for (const r of filteredReservations) {
      const t = totals.get(r.source) ?? { count: 0, total: 0 };
      t.count += 1;
      t.total += Number(r.total_amount_ars);
      totals.set(r.source, t);
    }
    const grand = Array.from(totals.values()).reduce(
      (a, v) => a + v.total,
      0
    );
    const rows = Array.from(totals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([src, v]) => [
        SOURCE_LABEL[src] ?? src,
        v.count,
        v.total,
        grand > 0 ? (v.total / grand) * 100 : 0,
      ]);
    downloadCsv(
      `ingresos-por-canal-${rangeSlug}.csv`,
      ["Canal", "Reservas", "Total ARS", "% del total"],
      rows.map((r) => [
        r[0],
        r[1],
        r[2],
        Number(r[3]).toFixed(2),
      ])
    );
  }

  function exportOccupancy() {
    const days = daysInRange(filters.from, filters.to);
    const props =
      filters.propertyIds.length === 0
        ? properties
        : properties.filter((p) => filters.propertyIds.includes(p.id));
    const rows = props.map((p) => {
      const list = filteredReservations.filter((r) => r.property_id === p.id);
      const occupied = list.reduce(
        (a, r) =>
          a + overlapNights(r.check_in, r.check_out, filters.from, filters.to),
        0
      );
      const revenue = list.reduce(
        (a, r) => a + Number(r.total_amount_ars),
        0
      );
      const occRate = days > 0 ? (occupied / days) * 100 : 0;
      const adr = occupied > 0 ? revenue / occupied : 0;
      return [
        p.name,
        occupied,
        days,
        occRate.toFixed(2),
        adr.toFixed(2),
        revenue,
      ];
    });
    downloadCsv(
      `ocupacion-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Noches ocupadas",
        "Noches del rango",
        "% Ocupación",
        "ADR ARS",
        "Ingresos ARS",
      ],
      rows
    );
  }

  function exportPending() {
    const rows = filteredReservations
      .filter((r) => Number(r.total_amount_ars) - Number(r.amount_paid_ars) > 0)
      .sort((a, b) => a.check_out.localeCompare(b.check_out))
      .map((r) => [
        r.property?.name ?? "",
        r.guest?.name ?? "",
        r.guest?.phone ?? "",
        r.check_out,
        r.total_amount_ars,
        r.amount_paid_ars,
        Number(r.total_amount_ars) - Number(r.amount_paid_ars),
      ]);
    downloadCsv(
      `saldos-pendientes-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Huésped",
        "Teléfono",
        "Check-out",
        "Total ARS",
        "Pagado ARS",
        "Saldo ARS",
      ],
      rows
    );
  }

  function exportFiscal() {
    // Income & expenses constrained by date range, ignoring property filter for
    // a full fiscal picture (matches what an accountant expects).
    const r = reservations.filter(
      (rv) =>
        rv.status !== "cancelled" &&
        rv.check_in >= filters.from &&
        rv.check_in <= filters.to
    );
    const e = expenses.filter(
      (ex) => ex.date >= filters.from && ex.date <= filters.to
    );

    const rows: (string | number)[][] = [
      ["INGRESOS POR RESERVAS"],
      ["Propiedad", "Huésped", "Check-in", "Check-out", "Total ARS"],
      ...r.map((rv) => [
        rv.property?.name ?? "",
        rv.guest?.name ?? "",
        rv.check_in,
        rv.check_out,
        rv.total_amount_ars,
      ]),
      [""],
      ["GASTOS"],
      ["Fecha", "Propiedad", "Categoría", "Descripción", "Importe ARS"],
      ...e.map((ex) => [
        ex.date,
        ex.property?.name ?? "General",
        ex.category,
        ex.description ?? "",
        ex.amount_ars,
      ]),
      [""],
      ["RESUMEN"],
      ["Total ingresos", r.reduce((a, b) => a + Number(b.total_amount_ars), 0)],
      ["Total gastos", e.reduce((a, b) => a + Number(b.amount_ars), 0)],
      [
        "Resultado",
        r.reduce((a, b) => a + Number(b.total_amount_ars), 0) -
          e.reduce((a, b) => a + Number(b.amount_ars), 0),
      ],
    ];
    downloadCsv(`reporte-fiscal-${rangeSlug}.csv`, [], rows);
  }

  // Tarjetas de exportación agrupadas por uso.
  const operativos: ReportCardSpec[] = [
    {
      key: "guests",
      icon: Users,
      title: "Lista de huéspedes",
      description:
        "Check-in, check-out, nombre, país y teléfono — ideal para coordinación y comunicación.",
      action: exportGuestList,
      highlight: true,
    },
    {
      key: "reservations",
      icon: Receipt,
      title: "Reservas detalladas",
      description:
        "Todas las reservas del rango con totales, pagos, canal y estado.",
      action: exportReservations,
    },
    {
      key: "pending",
      icon: AlertCircle,
      title: "Saldos pendientes",
      description: "Reservas con saldo a cobrar — ordenadas por check-out.",
      action: exportPending,
      tone: "warning",
    },
    {
      key: "occupancy",
      icon: Wallet,
      title: "Ocupación y ADR",
      description: "Noches ocupadas, % ocupación y tarifa promedio diaria.",
      action: exportOccupancy,
    },
  ];

  const contables: ReportCardSpec[] = [
    {
      key: "consolidated",
      icon: BarChart3,
      title: "Ingresos por propiedad",
      description: "Totales del período agrupados por propiedad.",
      action: exportConsolidated,
    },
    {
      key: "source",
      icon: TrendingUp,
      title: "Ingresos por canal",
      description: "Reservas y revenue por canal (Airbnb, Booking, Directo, Otro).",
      action: exportBySource,
    },
    {
      key: "fiscal",
      icon: Calculator,
      title: "Reporte fiscal",
      description:
        "Ingresos y gastos del período con resumen de resultado.",
      action: exportFiscal,
    },
  ];

  return (
    <div className="space-y-6">
      <ReportsFilters
        properties={properties}
        value={filters}
        onChange={setFilters}
      />

      {/* Pagos pendientes — al frente, sólo si hay saldo a cobrar. */}
      {summary.pending > 0 ? (
        <Card className="border-2 border-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Pagos pendientes
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount}{" "}
                  {pendingCount === 1
                    ? "reserva con saldo a cobrar"
                    : "reservas con saldo a cobrar"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <p className="numeric text-3xl font-semibold sm:text-4xl">
                {formatCurrency(summary.pending)}
              </p>
              <Button type="button" variant="outline" onClick={exportPending}>
                <Download className="h-4 w-4" />
                Descargar saldos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ReportsKpis summary={summary} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Ingresos · últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsTrendChart
            reservations={reservations}
            properties={filteredProperties}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reportes operativos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operativos.map((card) => (
              <ReportCard key={card.key} spec={card} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reportes contables
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contables.map((card) => (
              <ReportCard key={card.key} spec={card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type ReportCardSpec = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: () => void;
  highlight?: boolean;
  tone?: "warning";
};

function ReportCard({ spec }: { spec: ReportCardSpec }) {
  const Icon = spec.icon;
  const iconBg =
    spec.tone === "warning"
      ? "bg-warning/10 text-warning"
      : spec.highlight
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  return (
    <Card
      className={`flex flex-col transition-shadow hover:shadow-sm ${
        spec.highlight ? "border-primary/40" : ""
      }`}
    >
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold leading-tight">
              {spec.title}
            </h3>
            <p className="text-xs leading-snug text-muted-foreground">
              {spec.description}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={spec.highlight ? "default" : "outline"}
          size="sm"
          className="mt-auto w-full"
          onClick={spec.action}
        >
          <Download className="h-4 w-4" />
          Descargar CSV
        </Button>
      </CardContent>
    </Card>
  );
}
```

Notas: se eliminan por completo el componente `PreviewTable` y la `Card` "Vista previa · reservas del período" que lo contenía — esa tabla duplica datos ya disponibles vía la exportación "Reservas detalladas". Por esa eliminación dejan de usarse los imports `Table`/`TableBody`/`TableCell`/`TableHead`/`TableHeader`/`TableRow` y `formatDateShort`, así que se quitan de los imports (de lo contrario eslint marcaría `no-unused-vars`). `STATUS_LABEL` y `formatCurrency` siguen usándose (en `exportReservations` y en el bloque de pagos pendientes respectivamente) y se mantienen. El bloque "Pagos pendientes" se renderiza entre los filtros y `ReportsKpis`, sólo cuando `summary.pending > 0`; usa `summary.pending` (ya calculado) y `pendingCount` (nuevo `useMemo` con el mismo predicado que `exportPending`). El arreglo único `reportCards` se parte en `operativos` (guests, reservations, pending, occupancy) y `contables` (consolidated, source, fiscal), renderizados bajo encabezados "Reportes operativos" y "Reportes contables" con el mismo estilo de heading que tenía "Descargas". Todas las funciones `export*` y `downloadCsv` quedan textualmente idénticas al original; no se toca la lógica de exportación CSV. Sin hex hardcodeado; los tonos usan tokens (`warning`, `primary`, `secondary`).

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/reports/reports-client.tsx"` → sin errores ni warnings (en particular, sin `no-unused-vars` por los imports de tabla removidos).
  - `pnpm build` → build exitoso.
  - Esperado: en `/reports`, debajo de los filtros aparece la tarjeta destacada "Pagos pendientes" (cuando hay saldo) con la cifra, la cantidad de reservas y el botón "Descargar saldos". Las tarjetas de exportación están en dos grupos con encabezados "Reportes operativos" (4 tarjetas) y "Reportes contables" (3 tarjetas). La tabla de vista previa del final ya no existe. El gráfico de tendencia y los KPIs siguen presentes.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(reports): destacar pagos pendientes y agrupar reportes operativos y contables"
```

---

## Verificación final de la Fase 4B

- [ ] `pnpm typecheck` termina sin errores.
- [ ] `pnpm exec eslint "app/(admin)/expenses/**/*.tsx" "app/(admin)/reports/reports-client.tsx"` termina sin errores ni warnings.
- [ ] `pnpm build` termina exitosamente.
- [ ] Revisión visual de Gastos (`/expenses`):
  - El KPI del mes (Gasto Total + tendencia vs período anterior) está claramente arriba, justo debajo de la barra de filtros.
  - La composición de egresos es una grilla de 2 columnas balanceada: donut a la izquierda y lista de categorías con divisores a la derecha, ambas `Card`s de igual peso (patrón `AnalisisSection`).
  - El historial de gastos muestra un punto de color de categoría en cada fila, con los mismos colores que el donut.
  - El checklist de gastos fijos es el último bloque de la página, bajo el encabezado "Gastos fijos del mes"; ya no aparece entre el KPI y el historial. Dentro de su `Card` el título es sólo el período (ej. "mayo 2026").
- [ ] Revisión visual de Reportes (`/reports`):
  - Cuando hay saldo a cobrar, la tarjeta destacada "Pagos pendientes" aparece debajo de los filtros, con la cifra, la cantidad de reservas con saldo y el botón "Descargar saldos" (que descarga el mismo CSV que la tarjeta "Saldos pendientes").
  - Las tarjetas de exportación están en dos grupos etiquetados: "Reportes operativos" (Lista de huéspedes, Reservas detalladas, Saldos pendientes, Ocupación y ADR) y "Reportes contables" (Ingresos por propiedad, Ingresos por canal, Reporte fiscal).
  - La tabla de vista previa de reservas del final fue eliminada.
  - El gráfico de tendencia "Ingresos · últimos 6 meses" y los KPIs siguen presentes y sin cambios funcionales.
- [ ] Sin cambios de base de datos, de queries ni de lógica de negocio; la lógica de exportación CSV no se modificó.
- [ ] Spanish rioplatense, sin emojis ni signos de exclamación en la UI.
```