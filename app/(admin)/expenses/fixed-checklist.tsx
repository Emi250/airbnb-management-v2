"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { FixedExpenseItem, FixedExpenseCheck } from "@/types/supabase";
import {
  addFixedItemAction,
  removeFixedItemAction,
  markFixedPaidAction,
  unmarkFixedPaidAction,
} from "./fixed-actions";

type CheckWithAmount = FixedExpenseCheck & { amount_ars?: number };

export function FixedChecklist({
  items,
  checks,
  period,
}: {
  items: FixedExpenseItem[];
  checks: CheckWithAmount[];
  period: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [payDialog, setPayDialog] = useState<{ id: string; label: string } | null>(null);
  const [amount, setAmount] = useState("");

  const periodDate = useMemo(() => new Date(period + "T00:00:00"), [period]);
  const periodLabel = format(periodDate, "MMMM yyyy", { locale: es });

  const checkByItem = useMemo(() => {
    const map = new Map<string, CheckWithAmount>();
    for (const c of checks) map.set(c.item_id, c);
    return map;
  }, [checks]);

  const paidCount = checkByItem.size;
  const totalCount = items.length;

  function openPayDialog(item: FixedExpenseItem) {
    setPayDialog({ id: item.id, label: item.label });
    setAmount("");
  }

  function confirmPay() {
    if (!payDialog) return;
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Ingresá un importe válido");
      return;
    }
    startTransition(async () => {
      const r = await markFixedPaidAction({
        item_id: payDialog.id,
        period,
        amount_ars: num,
        property_id: null,
      });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`${payDialog.label} marcado como pagado`);
        setPayDialog(null);
        router.refresh();
      }
    });
  }

  function unmark(item: FixedExpenseItem) {
    if (!confirm(`Desmarcar "${item.label}" y eliminar el gasto registrado?`)) return;
    startTransition(async () => {
      const r = await unmarkFixedPaidAction(item.id, period);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Gasto desmarcado");
        router.refresh();
      }
    });
  }

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      const r = await addFixedItemAction({ label });
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Ítem agregado");
        setNewLabel("");
        router.refresh();
      }
    });
  }

  function removeItem(item: FixedExpenseItem) {
    if (
      !confirm(
        `Eliminar "${item.label}" del checklist? Los registros de gastos pasados se mantendrán.`
      )
    )
      return;
    startTransition(async () => {
      const r = await removeFixedItemAction(item.id);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Ítem eliminado");
        router.refresh();
      }
    });
  }

  return (
    <Card>
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
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay gastos fijos. Agregá uno desde abajo.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const check = checkByItem.get(item.id);
              const paid = !!check;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition-colors",
                    paid
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-dashed border-border bg-background"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => (paid ? unmark(item) : openPayDialog(item))}
                    disabled={isPending}
                    className="flex flex-1 items-center gap-2 text-left disabled:opacity-50"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        paid
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border"
                      )}
                    >
                      {paid && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn("text-sm", paid && "font-medium")}>
                      {item.label}
                    </span>
                    {paid && check?.amount_ars != null && (
                      <span className="numeric ml-auto text-xs text-muted-foreground">
                        {formatCurrency(Number(check.amount_ars))}
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeItem(item)}
                    disabled={isPending}
                    aria-label={`Eliminar ${item.label}`}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Nuevo gasto fijo (ej: Seguro auto)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            disabled={isPending}
          />
          <Button
            type="button"
            onClick={addItem}
            disabled={isPending || newLabel.trim().length === 0}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </CardContent>

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago · {payDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Importe abonado *</Label>
              <Input
                type="number"
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmPay();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Se registrará un gasto con categoría &ldquo;Gasto Fijo&rdquo; y
                fecha {format(periodDate, "MMMM yyyy", { locale: es })}.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPayDialog(null)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={confirmPay} disabled={isPending}>
                {isPending ? "Guardando..." : "Confirmar pago"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
