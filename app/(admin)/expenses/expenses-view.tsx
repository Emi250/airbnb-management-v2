"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { createExpenseAction, deleteExpenseAction } from "./actions";
import type { Property } from "@/types/supabase";

type ExpenseRow = {
  id: string;
  property_id: string | null;
  date: string;
  category: string;
  amount_ars: number;
  description: string | null;
  property: { name: string; color_hex: string | null } | null;
};

export function ExpensesView({
  expenses,
  properties,
}: {
  expenses: ExpenseRow[];
  properties: Property[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: "cleaning",
      amount_ars: 0,
      property_id: properties[0]?.id ?? null,
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

  const totalsByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount_ars);
    return acc;
  }, {});
  const totalAll = Object.values(totalsByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Registrar gasto
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totalsByCategory).map(([cat, total]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-xs uppercase capitalize text-muted-foreground">{cat}</p>
              <p className="numeric mt-2 text-xl font-semibold">{formatCurrency(total)}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Total</p>
            <p className="numeric mt-2 text-xl font-semibold">{formatCurrency(totalAll)}</p>
          </CardContent>
        </Card>
      </div>

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
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatDateShort(e.date)}</TableCell>
              <TableCell>
                {e.property ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: e.property.color_hex ?? "#A47148" }}
                    />
                    {e.property.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">General</span>
                )}
              </TableCell>
              <TableCell className="capitalize">{e.category}</TableCell>
              <TableCell>{e.description ?? "—"}</TableCell>
              <TableCell className="numeric text-right">
                {formatCurrency(e.amount_ars)}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
                <select
                  {...register("property_id")}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">General</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <select
                  {...register("category")}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="cleaning">Limpieza</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="utilities">Servicios</option>
                  <option value="supplies">Insumos</option>
                  <option value="tax">Impuestos</option>
                  <option value="other">Otro</option>
                </select>
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
