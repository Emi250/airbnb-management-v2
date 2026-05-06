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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import { formatCurrency } from "@/lib/format";
import { STATUS_LABEL, SOURCE_LABEL } from "@/lib/reservation-options";
import { cn } from "@/lib/utils";
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

function SectionHeader({
  step,
  kicker,
  title,
  description,
  trailing,
}: {
  step: string;
  kicker: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-1">
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          {step} · {kicker}
        </p>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {trailing}
    </header>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <div aria-live="polite" className="min-h-0">
      {message && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <span aria-hidden>•</span>
          {message}
        </p>
      )}
    </div>
  );
}

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
  const platformFee = Number(watch("platform_fee_ars") ?? 0);
  const cleaningFee = Number(watch("cleaning_fee_ars") ?? 0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  }, [checkIn, checkOut]);

  const balance = total - paid;
  const pricePerNight = nights > 0 ? total / nights : 0;
  const cobrado = total > 0 && balance === 0;
  const exceso = total > 0 && balance < 0;

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
      {/* 01 · Reserva */}
      <section className="space-y-6 rounded-xl border border-border bg-card p-6">
        <SectionHeader
          step="01"
          kicker="Reserva"
          title="Propiedad y estadía"
          description="Definí qué propiedad y cuándo se ocupa."
        />

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
          <FieldError message={errors.property_id?.message} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium tracking-tight">Estadía</h3>
            {nights > 0 && (
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {nights} {nights === 1 ? "noche" : "noches"}
              </span>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Check-in *</Label>
              <Controller
                control={control}
                name="check_in"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Elegir fecha"
                    ariaLabel="Check-in"
                  />
                )}
              />
              <FieldError message={errors.check_in?.message} />
            </div>
            <div className="space-y-2">
              <Label>Check-out *</Label>
              <Controller
                control={control}
                name="check_out"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Elegir fecha"
                    minDate={checkIn || undefined}
                    ariaLabel="Check-out"
                  />
                )}
              />
              <FieldError message={errors.check_out?.message} />
            </div>
            <div className="space-y-2">
              <Label>Huéspedes *</Label>
              <Controller
                control={control}
                name="num_guests"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "huésped" : "huéspedes"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.num_guests?.message} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium tracking-tight">Clasificación</h3>
          <div className="grid gap-5 md:grid-cols-2">
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
        </div>
      </section>

      {/* 02 · Huésped */}
      <section className="space-y-6 rounded-xl border border-border bg-card p-6">
        <SectionHeader
          step="02"
          kicker="Huésped"
          title="Huésped"
          description="Asociá un huésped existente o creá uno nuevo."
          trailing={
            <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCreateGuest(false)}
                disabled={!guests.length}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  !createGuest
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                  !guests.length && "cursor-not-allowed opacity-50 hover:text-muted-foreground"
                )}
              >
                Existente
              </button>
              <button
                type="button"
                onClick={() => setCreateGuest(true)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors",
                  createGuest
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                Nuevo
              </button>
            </div>
          }
        />

        {!guests.length && (
          <p className="text-xs text-muted-foreground">
            Aún no tenés huéspedes guardados — completá los datos abajo.
          </p>
        )}

        {createGuest ? (
          <div className="grid gap-5 md:grid-cols-2">
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
            <FieldError message={errors.guest_id?.message} />
          </div>
        )}
      </section>

      {/* 03 · Pagos */}
      <section className="space-y-6 rounded-xl border border-border bg-card p-6">
        <SectionHeader
          step="03"
          kicker="Pagos"
          title="Importes"
          description="Todo en pesos. El saldo se calcula automáticamente."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Monto total *</Label>
            <Input type="number" step="0.01" {...register("total_amount_ars")} />
            <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Pagado</Label>
            <Input type="number" step="0.01" {...register("amount_paid_ars")} />
            <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(paid)}
            </p>
            <FieldError message={errors.amount_paid_ars?.message} />
          </div>
          <div className="space-y-2">
            <Label>Comisión plataforma</Label>
            <Input type="number" step="0.01" {...register("platform_fee_ars")} />
            <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(platformFee)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Limpieza</Label>
            <Input type="number" step="0.01" {...register("cleaning_fee_ars")} />
            <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(cleaningFee)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl bg-muted/50 p-5 sm:grid-cols-3">
          <div className="space-y-1 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Noches
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {nights > 0 ? nights : "—"}
            </p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Por noche
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {nights > 0 ? formatCurrency(pricePerNight) : "—"}
            </p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Saldo
            </p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                cobrado && "text-success",
                exceso && "text-destructive"
              )}
            >
              {total === 0 ? "—" : formatCurrency(Math.abs(balance))}
            </p>
            <p
              className={cn(
                "text-[10px] uppercase tracking-wider text-muted-foreground",
                exceso && "text-destructive"
              )}
            >
              {total === 0
                ? "Cargá el total"
                : exceso
                  ? "Exceso"
                  : cobrado
                    ? "Cobrado"
                    : "Pendiente"}
            </p>
          </div>
        </div>
      </section>

      {/* 04 · Notas */}
      <section className="space-y-3 border-t border-border pt-6">
        <SectionHeader step="04" kicker="Notas" title="Notas internas" />
        <Textarea rows={3} {...register("notes")} placeholder="Información adicional..." />
      </section>

      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
        {mode === "edit" && (
          <Button
            type="button"
            variant="destructive"
            onClick={onCancelReservation}
            disabled={isPending}
            className="w-full md:w-auto"
          >
            Cancelar reserva
          </Button>
        )}
        <Button
          type="button"
          variant="link"
          onClick={() => router.back()}
          disabled={isPending}
          className="md:order-none"
        >
          Volver
        </Button>
        <Button type="submit" disabled={isPending} className="w-full md:w-auto">
          {isPending ? "Guardando..." : mode === "create" ? "Crear reserva" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
