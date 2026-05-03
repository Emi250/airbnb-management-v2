"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import { formatCurrency } from "@/lib/format";
import { STATUS_LABEL, SOURCE_LABEL } from "@/lib/reservation-options";
import {
  createReservationAction,
  updateReservationAction,
  cancelReservationAction,
} from "./actions";
import type {
  Property,
  Guest,
  ReservationStatus,
  ReservationSource,
} from "@/types/supabase";

type Defaults = Partial<ReservationInput> & { id?: string };

export function ReservationForm({
  properties,
  guests,
  defaults,
  mode,
}: {
  properties: Property[];
  guests: Guest[];
  defaults?: Defaults;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createGuest, setCreateGuest] = useState(!defaults?.guest_id && !guests.length);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ReservationInput>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      property_id: defaults?.property_id ?? "",
      guest_id: defaults?.guest_id ?? null,
      check_in: defaults?.check_in ?? "",
      check_out: defaults?.check_out ?? "",
      num_guests: defaults?.num_guests ?? 2,
      total_amount_ars: defaults?.total_amount_ars ?? 0,
      amount_paid_ars: defaults?.amount_paid_ars ?? 0,
      source: defaults?.source ?? "airbnb",
      platform_fee_ars: defaults?.platform_fee_ars ?? 0,
      cleaning_fee_ars: defaults?.cleaning_fee_ars ?? 0,
      status: defaults?.status ?? "confirmed",
      notes: defaults?.notes ?? "",
      new_guest_name: "",
      new_guest_phone: "",
      new_guest_email: "",
      new_guest_country: "",
    },
  });

  const checkIn = watch("check_in");
  const checkOut = watch("check_out");
  const total = Number(watch("total_amount_ars") ?? 0);
  const paid = Number(watch("amount_paid_ars") ?? 0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }, [checkIn, checkOut]);

  const balance = total - paid;
  const pricePerNight = nights > 0 ? total / nights : 0;

  function onSubmit(values: ReservationInput) {
    startTransition(async () => {
      const action =
        mode === "create"
          ? await createReservationAction(values)
          : await updateReservationAction(defaults!.id!, values);

      if (!action.success) {
        toast.error(action.error);
        return;
      }
      toast.success(mode === "create" ? "Reserva creada" : "Reserva actualizada");
      router.push(`/reservations/${action.id}`);
      router.refresh();
    });
  }

  function onCancelReservation() {
    if (!defaults?.id) return;
    if (!confirm("¿Cancelar esta reserva? El registro se conservará con estado 'cancelada'.")) return;
    startTransition(async () => {
      const r = await cancelReservationAction(defaults.id!);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Reserva cancelada");
        router.push("/reservations");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Propiedad y fechas</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Propiedad *</Label>
            <Controller
              control={control}
              name="property_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.property_id && <p className="text-xs text-destructive">{errors.property_id.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Check-in *</Label>
            <Input type="date" {...register("check_in")} />
            {errors.check_in && <p className="text-xs text-destructive">{errors.check_in.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Check-out *</Label>
            <Input type="date" {...register("check_out")} />
            {errors.check_out && <p className="text-xs text-destructive">{errors.check_out.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Huéspedes *</Label>
            <Input type="number" min={1} {...register("num_guests")} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABEL) as [ReservationStatus, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Canal</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SOURCE_LABEL) as [ReservationSource, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Huésped</h2>
          <div className="flex items-center gap-2 text-xs">
            <Switch checked={createGuest} onCheckedChange={setCreateGuest} />
            <span>Crear nuevo huésped</span>
          </div>
        </div>

        {createGuest ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input {...register("new_guest_name")} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input {...register("new_guest_phone")} placeholder="+5491155551111" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register("new_guest_email")} />
            </div>
            <div className="space-y-2">
              <Label>País</Label>
              <Input {...register("new_guest_country")} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Huésped existente *</Label>
            <Controller
              control={control}
              name="guest_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} {g.country ? `· ${g.country}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.guest_id && <p className="text-xs text-destructive">{errors.guest_id.message}</p>}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Importes (ARS)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Monto total *</Label>
            <Input type="number" step="0.01" {...register("total_amount_ars")} />
          </div>
          <div className="space-y-2">
            <Label>Pagado</Label>
            <Input type="number" step="0.01" {...register("amount_paid_ars")} />
            {errors.amount_paid_ars && (
              <p className="text-xs text-destructive">{errors.amount_paid_ars.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Comisión plataforma</Label>
            <Input type="number" step="0.01" {...register("platform_fee_ars")} />
          </div>
          <div className="space-y-2">
            <Label>Limpieza</Label>
            <Input type="number" step="0.01" {...register("cleaning_fee_ars")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-dashed border-border p-4 text-center">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Noches</p>
            <p className="numeric text-lg font-semibold">{nights}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Por noche</p>
            <p className="numeric text-lg font-semibold">{formatCurrency(pricePerNight)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Saldo</p>
            <p className="numeric text-lg font-semibold">{formatCurrency(balance)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Notas</h2>
        <Textarea rows={3} {...register("notes")} placeholder="Información adicional..." />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {mode === "edit" && (
          <Button
            type="button"
            variant="destructive"
            onClick={onCancelReservation}
            disabled={isPending}
          >
            Cancelar reserva
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Volver
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : mode === "create" ? "Crear reserva" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
