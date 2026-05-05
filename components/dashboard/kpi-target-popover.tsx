"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/lib/use-media-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertMonthlyTargetAction,
  deleteMonthlyTargetAction,
} from "@/app/(admin)/dashboard/targets-actions";
import type { MonthlyTarget, Property } from "@/types/supabase";

type Props = {
  /** The trigger element. Should be a button. */
  children: React.ReactNode;
  /** Properties currently in filter scope. */
  properties: Pick<Property, "id" | "name">[];
  /** Existing targets — used to prefill inputs. */
  targets: MonthlyTarget[];
  /** First-of-month yyyy-MM-01 string for the month being edited. */
  monthKey: string;
};

type RowValues = { revenue: string; occupancy: string };

export function KpiTargetPopover({ children, properties, targets, monthKey }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>Editar objetivos</DialogTitle>
          <DialogDescription className="sr-only">
            Editar los objetivos de ingresos y ocupación mensuales por propiedad.
          </DialogDescription>
          <TargetForm
            properties={properties}
            targets={targets}
            monthKey={monthKey}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <TargetForm
          properties={properties}
          targets={targets}
          monthKey={monthKey}
          onClose={() => setOpen(false)}
          showHeading
        />
      </PopoverContent>
    </Popover>
  );
}

function TargetForm({
  properties,
  targets,
  monthKey,
  onClose,
  showHeading,
}: {
  properties: Pick<Property, "id" | "name">[];
  targets: MonthlyTarget[];
  monthKey: string;
  onClose: () => void;
  showHeading?: boolean;
}) {
  const initial = useMemo<Record<string, RowValues>>(() => {
    const map: Record<string, RowValues> = {};
    for (const p of properties) {
      const row = targets.find((t) => t.property_id === p.id && t.month === monthKey);
      map[p.id] = {
        revenue: row ? String(row.target_revenue_ars) : "",
        occupancy:
          row && row.target_occupancy !== null && row.target_occupancy !== undefined
            ? String(row.target_occupancy)
            : "",
      };
    }
    return map;
  }, [properties, targets, monthKey]);

  const [values, setValues] = useState<Record<string, RowValues>>(initial);
  const [isPending, startTransition] = useTransition();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMMM yyyy", { locale: es });
  }, [monthKey]);

  function handleSameForAll() {
    const first = properties[0];
    if (!first) return;
    const v = values[first.id] ?? { revenue: "", occupancy: "" };
    const next: Record<string, RowValues> = {};
    for (const p of properties) next[p.id] = { ...v };
    setValues(next);
  }

  function setRow(propId: string, patch: Partial<RowValues>) {
    setValues((prev) => ({
      ...prev,
      [propId]: { ...(prev[propId] ?? { revenue: "", occupancy: "" }), ...patch },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const errors: string[] = [];
      let saved = 0;
      for (const p of properties) {
        const row = values[p.id] ?? { revenue: "", occupancy: "" };
        const revRaw = row.revenue.trim();
        const occRaw = row.occupancy.trim();
        const had = targets.some((t) => t.property_id === p.id && t.month === monthKey);

        if (revRaw === "" && occRaw === "") {
          if (!had) continue;
          const res = await deleteMonthlyTargetAction({ property_id: p.id, month: monthKey });
          if (!res.success) errors.push(`${p.name}: ${res.error}`);
          else saved++;
          continue;
        }

        if (revRaw === "") {
          // Occupancy without a revenue target is not allowed (target_revenue_ars is NOT NULL).
          errors.push(`${p.name}: el objetivo de ingresos es obligatorio`);
          continue;
        }

        const revNum = Number(revRaw.replace(/[^\d.]/g, ""));
        if (!Number.isFinite(revNum) || revNum < 0) {
          errors.push(`${p.name}: importe de ingresos inválido`);
          continue;
        }

        let occNum: number | null = null;
        if (occRaw !== "") {
          const parsed = Number(occRaw.replace(",", "."));
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
            errors.push(`${p.name}: ocupación inválida (0–100)`);
            continue;
          }
          occNum = parsed;
        }

        const res = await upsertMonthlyTargetAction({
          property_id: p.id,
          month: monthKey,
          target_revenue_ars: revNum,
          target_occupancy: occNum,
        });
        if (!res.success) errors.push(`${p.name}: ${res.error}`);
        else saved++;
      }
      if (errors.length === 0) {
        toast.success(saved === 0 ? "Sin cambios" : "Objetivos actualizados");
        onClose();
      } else {
        toast.error(`No se pudo guardar: ${errors.join(" · ")}`);
      }
    });
  }

  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná al menos una propiedad en los filtros para editar su objetivo.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {showHeading ? (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Objetivos del mes</p>
          <p className="text-xs text-muted-foreground">
            Editando <span className="capitalize">{monthLabel}</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Editando <span className="capitalize">{monthLabel}</span>
        </p>
      )}

      <div className="space-y-3">
        {properties.map((p, idx) => {
          const row = values[p.id] ?? { revenue: "", occupancy: "" };
          return (
            <div key={p.id} className="space-y-1.5">
              {properties.length > 1 ? (
                <p className="text-xs font-medium text-foreground">{p.name}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`rev-${p.id}`} className="text-xs text-muted-foreground">
                    Ingresos (ARS)
                  </Label>
                  <Input
                    id={`rev-${p.id}`}
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="number"
                    inputMode="decimal"
                    step="1000"
                    min="0"
                    placeholder="0"
                    className="tabular-nums"
                    value={row.revenue}
                    onChange={(e) => setRow(p.id, { revenue: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`occ-${p.id}`} className="text-xs text-muted-foreground">
                    Ocupación (%)
                  </Label>
                  <Input
                    id={`occ-${p.id}`}
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="—"
                    className="tabular-nums"
                    value={row.occupancy}
                    onChange={(e) => setRow(p.id, { occupancy: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {properties.length > 1 ? (
        <button
          type="button"
          onClick={handleSameForAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Igual para todas
        </button>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
