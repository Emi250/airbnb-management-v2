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
