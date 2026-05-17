"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateLong, toDate } from "@/lib/format";
import { exchangeRateSchema, propertySchema, type ExchangeRateInput, type PropertyInput } from "@/lib/schemas";
import { updateExchangeRateAction, updatePropertyAction } from "./actions";
import type { ExchangeRate, Property, UserRoleRow } from "@/types/supabase";

/** Umbral en días tras el cual la cotización se considera desactualizada. */
const RATE_STALE_DAYS = 7;

export function SettingsClient({
  properties,
  rate,
  users,
}: {
  properties: Property[];
  rate: ExchangeRate;
  users: UserRoleRow[];
}) {
  return (
    <Tabs defaultValue="rates">
      <TabsList>
        <TabsTrigger value="rates">Tipos de cambio</TabsTrigger>
        <TabsTrigger value="properties">Propiedades</TabsTrigger>
        <TabsTrigger value="users">Usuarios</TabsTrigger>
      </TabsList>

      <TabsContent value="rates">
        <RateForm rate={rate} />
      </TabsContent>

      <TabsContent value="properties">
        <div className="space-y-4">
          {properties.map((p) => (
            <PropertyForm key={p.id} property={p} />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="users">
        <UsersList users={users} />
      </TabsContent>
    </Tabs>
  );
}

function RateForm({ rate }: { rate: ExchangeRate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExchangeRateInput>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: { ars_per_usd: rate.ars_per_usd, ars_per_eur: rate.ars_per_eur },
  });

  // Antigüedad de la cotización derivada del updated_at existente.
  const ageDays = rate.updated_at
    ? differenceInDays(new Date(), toDate(rate.updated_at))
    : 0;
  const isStale = ageDays > RATE_STALE_DAYS;

  function onSubmit(values: ExchangeRateInput) {
    startTransition(async () => {
      const r = await updateExchangeRateAction(values);
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Tipos de cambio actualizados");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de cambio</CardTitle>
      </CardHeader>
      <CardContent>
        {isStale ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="text-xs">
              <p className="font-medium">
                La cotización tiene más de una semana.
              </p>
              <p className="text-warning/80">
                Última actualización: {formatDateLong(rate.updated_at)} ({ageDays}{" "}
                días). Actualizala para que los montos en USD y EUR sean precisos.
              </p>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-xs text-muted-foreground">
            Última actualización: {formatDateLong(rate.updated_at)}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>ARS por USD</Label>
            <Input type="number" step="0.0001" {...register("ars_per_usd")} />
            {errors.ars_per_usd && (
              <p className="text-xs text-destructive">{errors.ars_per_usd.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>ARS por EUR</Label>
            <Input type="number" step="0.0001" {...register("ars_per_eur")} />
            {errors.ars_per_eur && (
              <p className="text-xs text-destructive">{errors.ars_per_eur.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PropertyForm({ property }: { property: Property }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState(property.active);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property.name,
      address: property.address ?? "",
      base_price_ars: Number(property.base_price_ars ?? 0),
      cleaning_fee_ars: Number(property.cleaning_fee_ars ?? 0),
      color_hex: property.color_hex ?? "#A47148",
      active: property.active,
    },
  });

  // Color elegido en vivo — alimenta el swatch junto al picker.
  const currentColor = watch("color_hex") ?? "#A47148";

  function onSubmit(values: PropertyInput) {
    startTransition(async () => {
      const r = await updatePropertyAction(property.id, { ...values, active });
      if (!r.success) toast.error(r.error);
      else {
        toast.success("Propiedad actualizada");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-3 text-base font-medium">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: property.color_hex ?? "#A47148" }}
          />
          {property.name}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <Switch checked={active} onCheckedChange={setActive} />
          <span>{active ? "Activa" : "Inactiva"}</span>
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Nombre</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Dirección</Label>
            <Input {...register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Precio base (ARS)</Label>
            <Input type="number" step="0.01" {...register("base_price_ars")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Limpieza (ARS)</Label>
            <Input type="number" step="0.01" {...register("cleaning_fee_ars")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: currentColor }}
                aria-hidden
              />
              <Input
                type="color"
                {...register("color_hex")}
                className="h-9 w-full min-w-0 p-1"
              />
            </div>
          </div>
          <div className="flex justify-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UsersList({ users }: { users: UserRoleRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Los usuarios se crean desde el panel de Supabase Auth. Asigná un rol agregando una fila a la
          tabla <code className="rounded bg-secondary px-1 py-0.5 text-xs">user_roles</code> con el
          UUID del usuario.
        </p>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin usuarios cargados.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {users.map((u) => (
              <li key={u.user_id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{u.display_name ?? u.user_id}</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs capitalize">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
