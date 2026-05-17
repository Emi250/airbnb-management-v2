# Rediseño Refugio del Corazón — Fase 4C: Propiedades y Ajustes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la jerarquía visual y de layout de las páginas de **Propiedades** y **Ajustes**. En Propiedades: enriquecer las tarjetas de la grilla, hoy mínimas (nombre, dirección, precio base, ingresos YTD), para que den más señal de un vistazo — ocupación del año en curso, ingresos del mes en curso y la fecha de la próxima reserva — derivando todas esas métricas en el server desde datos que `properties/page.tsx` **ya** trae (la query `select("*")` sobre `reservations` ya devuelve todas las columnas necesarias); y agregar el punto/swatch de color de la propiedad al encabezado de la página de detalle (`[id]/page.tsx`), que hoy no lo muestra aunque la tarjeta de la grilla sí. En Ajustes: compactar los formularios de edición de propiedad, hoy muy largos por propiedad, reduciendo el bulto vertical (grilla de campos más densa, espaciado más chico) sin quitar ningún campo ni tocar la lógica de guardado; mostrar una advertencia clara en la sección de tipos de cambio cuando la cotización está desactualizada (`updated_at` con más de 7 días), derivada del timestamp existente; y hacer que el selector de color de propiedad sea visualmente consistente con cómo aparece el color en el resto de la app (un swatch visible junto al input). Sin features nuevas, sin cambios de lógica de negocio, sin cambios de base de datos, sin nuevas queries y sin tocar los server actions.

**Architecture:** Cambio puramente de layout, jerarquía e interacción. Ningún archivo nuevo: se reescriben `app/(admin)/properties/page.tsx` (Server Component — agrega cálculo server-side de métricas por propiedad y enriquece la tarjeta), `app/(admin)/properties/[id]/page.tsx` (sólo el `PageHeader`: agrega el swatch de color en `actions` o vía título compuesto) y `app/(admin)/settings/settings-client.tsx` (Client Component — compacta `PropertyForm`, agrega aviso de cotización vieja en `RateForm`, agrega swatch al picker de color). En **Propiedades**, la página ya hace `supabase.from("reservations").select("*")`, así que cada reserva trae `check_in`, `check_out`, `status`, `total_amount_ars` y `property_id`: con eso se derivan, por propiedad y en el server, la ocupación del año en curso (`occupancyRate` de `lib/analytics.ts`, ya importable), los ingresos del mes en curso (`sumRevenue` con `startOfMonth`/`endOfMonth`) y la fecha de la próxima reserva (filtro de reservas activas con `check_in >= hoy`, ordenadas). La tarjeta pasa a mostrar cuatro métricas en vez de dos. En **Ajustes**, `PropertyForm` reduce `gap-4`→`gap-3`, `space-y-2`→`space-y-1.5`, mete más campos en la grilla de 2 columnas (sólo "Nombre" queda a ancho completo) y agrupa precio base, limpieza y color en una fila de 3; el picker de color gana un swatch redondo a su lado mostrando el valor actual. `RateForm` calcula los días transcurridos desde `rate.updated_at` con `differenceInDays` y, si superan el umbral de 7 días, muestra un aviso con `tone` de advertencia. `properties/actions.ts`, `settings/actions.ts`, `settings/page.tsx` y `lib/analytics.ts` NO se modifican; las interfaces de props y las queries quedan intactas.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, date-fns (`es`), componentes shadcn existentes (`Card`, `Tabs`, `Input`, `Label`, `Switch`, `Button`), `PageHeader` de `components/page-header.tsx`, helpers `formatCurrency`/`formatPercent`/`formatDateShort`/`formatDateLong` de `lib/format.ts`, `sumRevenue`/`occupancyRate` de `lib/analytics.ts`, `listProperties` de `lib/queries/reservations.ts`, `AlertTriangle` de `lucide-react`, tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación de cada tarea: `pnpm typecheck`, `pnpm exec eslint <archivos modificados>` y `pnpm build`. NO usar `pnpm lint` — lintea archivos generados con errores preexistentes. No hay infraestructura de tests unitarios en el proyecto; la verificación es typecheck + eslint + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `app/(admin)/properties/page.tsx` | Modificar | Derivar server-side ocupación del año, ingresos del mes y próxima reserva por propiedad desde los datos ya traídos; enriquecer la tarjeta de la grilla con esas tres métricas adicionales. |
| `app/(admin)/properties/[id]/page.tsx` | Modificar | Sólo el encabezado: mostrar el swatch de color de la propiedad junto al título, consistente con la tarjeta de la grilla. |
| `app/(admin)/settings/settings-client.tsx` | Modificar | Compactar `PropertyForm` (grilla más densa, menos espaciado vertical); aviso de cotización desactualizada en `RateForm`; swatch visible junto al picker de color. |

`app/(admin)/properties/actions.ts`, `app/(admin)/settings/actions.ts`, `app/(admin)/settings/page.tsx`, `lib/analytics.ts`, `lib/format.ts`, `lib/queries/reservations.ts`, `components/page-header.tsx`, `components/ui/card.tsx`, `components/ui/tabs.tsx`, `components/ui/input.tsx`, `components/ui/switch.tsx` y `components/dashboard/section-heading.tsx` NO se modifican.

---

## Task 1: Propiedades — tarjetas de la grilla con más señal de un vistazo

`PropertiesPage` es un Server Component que ya trae `properties` (vía `listProperties`) y todas las reservas (`supabase.from("reservations").select("*")`). Hoy calcula sólo `ytd` por propiedad y la tarjeta muestra cuatro datos: nombre, dirección, precio base, ingresos YTD. Esta tarea agrega tres métricas más a la tarjeta — **ocupación del año en curso**, **ingresos del mes en curso** y **próxima reserva** — derivadas en el server desde los datos que ya están en alcance. No se agrega ninguna query nueva ni se toca `actions.ts`.

**Decisión de métricas (Propiedades):** las tres métricas se derivan de las reservas ya traídas. La query es `select("*")`, así que cada fila de `reservations` incluye `check_in`, `check_out`, `status`, `total_amount_ars` y `property_id` — exactamente lo que necesitan los helpers de `lib/analytics.ts`.
- **Ocupación (año en curso):** `occupancyRate(propReservations, [p], startOfYear(now), endOfDay(now))` — noches ocupadas sobre noches disponibles del año en curso para esa única propiedad. Es la misma ventana YTD que ya usa la tarjeta para ingresos, así ambas métricas son comparables.
- **Ingresos del mes en curso:** `sumRevenue(propReservations, startOfMonth(now), endOfMonth(now))` — mismo helper que ya usa la página para `ytd`, sólo con otra ventana.
- **Próxima reserva:** filtro de las reservas de la propiedad con `status !== "cancelled"` y `check_in >= hoy`, ordenadas por `check_in` ascendente; se toma la primera y se muestra su `check_in` con `formatDateShort`; si no hay, se muestra "Sin próximas". Es exactamente el mismo criterio que `[id]/page.tsx` usa para su sección "Próximas reservas".

Ninguna de las tres métricas necesita una query nueva: las tres salen de `reservations`, que ya está en memoria. No se omite ninguna de las tres métricas pedidas.

**Decisión de layout (tarjeta):** la grilla de métricas pasa de `grid-cols-2` (2 datos) a `grid-cols-2` con cuatro celdas (precio base, ocupación año, ingresos mes, ingresos YTD) más una línea separada abajo para "Próxima reserva" a ancho completo. Se mantiene el `Card` con `hover:bg-secondary/50` y el swatch de color de 9×9 ya existentes; no se introduce ningún color hardcodeado nuevo (el fallback `#A47148`, ya presente en el original, se conserva).

**Files:**
- Modificar: `app/(admin)/properties/page.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/properties/page.tsx`** con exactamente este contenido:

```tsx
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listProperties } from "@/lib/queries/reservations";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateShort, formatPercent } from "@/lib/format";
import { startOfYear, startOfMonth, endOfMonth, endOfDay } from "date-fns";
import { sumRevenue, occupancyRate } from "@/lib/analytics";

export default async function PropertiesPage() {
  const properties = await listProperties();
  const supabase = await createClient();
  const { data: reservations } = await supabase.from("reservations").select("*");
  const all = reservations ?? [];

  const now = new Date();
  const yearStart = startOfYear(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const today = endOfDay(now);

  return (
    <div>
      <PageHeader title="Propiedades" description="Detalle por propiedad" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const propReservations = all.filter((r) => r.property_id === p.id);

          const ytd = sumRevenue(propReservations, yearStart, today);
          const monthRevenue = sumRevenue(propReservations, monthStart, monthEnd);
          const occ = occupancyRate(propReservations, [p], yearStart, today);

          // Próxima reserva: misma lógica que la sección "Próximas reservas"
          // de la página de detalle — reservas activas con check-in futuro.
          const nextReservation = propReservations
            .filter((r) => r.status !== "cancelled" && new Date(r.check_in) >= now)
            .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

          return (
            <Link key={p.id} href={`/properties/${p.id}`} className="group">
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 shrink-0 rounded-lg"
                      style={{ backgroundColor: p.color_hex ?? "#A47148" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.address ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Precio base</p>
                      <p className="numeric font-medium">
                        {formatCurrency(Number(p.base_price_ars ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ocupación año</p>
                      <p className="numeric font-medium">{formatPercent(occ)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos mes</p>
                      <p className="numeric font-medium">
                        {formatCurrency(monthRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos YTD</p>
                      <p className="numeric font-medium">{formatCurrency(ytd)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-xs text-muted-foreground">
                      Próxima reserva
                    </span>
                    <span className="numeric font-medium">
                      {nextReservation
                        ? formatDateShort(nextReservation.check_in)
                        : "Sin próximas"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

Notas: la query `supabase.from("reservations").select("*")` no cambia — sigue trayendo todas las reservas con todas las columnas, lo que da acceso a `check_in`, `check_out`, `status`, `total_amount_ars` y `property_id`. Las tres métricas nuevas se calculan en el server dentro del `map`, reutilizando `sumRevenue` y `occupancyRate` de `lib/analytics.ts` (este último ya recibe `(reservations, properties, from, to)` y se le pasa `[p]` para acotar a la propiedad). `occupancyRate` y `sumRevenue` filtran internamente las reservas canceladas, así que no hace falta pre-filtrar para esas dos. La "Próxima reserva" sí filtra explícitamente `status !== "cancelled"` y `check_in >= now`, idéntico al criterio de `upcoming` en `[id]/page.tsx`. Las fechas de borde (`startOfYear`, `startOfMonth`, `endOfMonth`, `endOfDay`) se calculan una sola vez fuera del `map`. La tarjeta pasa de 2 a 4 celdas de métrica en la grilla `grid-cols-2`, más una fila inferior separada por `border-t` para "Próxima reserva". No se omite ninguna métrica: las tres pedidas (ocupación, ingresos del mes, próxima reserva) salen de datos ya en alcance. El fallback de color `#A47148` ya existía en el original y se conserva; sin colores nuevos hardcodeados. Sin emojis ni signos de exclamación.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/properties/page.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/properties`, cada tarjeta de la grilla muestra, además del swatch de color, nombre y dirección: una grilla de 4 métricas (Precio base, Ocupación año, Ingresos mes, Ingresos YTD) y una fila inferior "Próxima reserva" con la fecha de la próxima reserva activa o "Sin próximas" si no hay. No hay queries nuevas; el conteo de requests a Supabase es el mismo que antes.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(properties): tarjetas de grilla con ocupacion, ingresos del mes y proxima reserva"
```

---

## Task 2: Propiedades — swatch de color en el encabezado de la página de detalle

`PropertyDetailPage` (`[id]/page.tsx`) ya trae `property` con `color_hex`, pero su `PageHeader` muestra sólo título y dirección — sin el punto de color que sí aparece en la tarjeta de la grilla. Esta tarea agrega el swatch de color al encabezado para que la página de detalle sea visualmente consistente con la grilla. `PageHeader` no se modifica; el componente acepta `title: string`, así que el swatch se inyecta envolviendo el título en un fragmento es imposible (el prop es `string`). En su lugar se usa el slot `actions` para el botón ya existente y se antepone el swatch como elemento hermano del `PageHeader` no es ideal; la solución limpia y sin tocar `PageHeader` es envolver `PageHeader` en un contenedor con el swatch posicionado a la izquierda del título mediante un pequeño wrapper. Para mantener el cambio mínimo y no modificar `components/page-header.tsx`, el swatch se renderiza dentro de `actions` no aplica (va a la derecha). Por lo tanto se reemplaza el uso directo de `PageHeader` por un encabezado equivalente inline que incluye el swatch, replicando exactamente el markup de `PageHeader` más el punto de color — sin crear componentes nuevos y sin tocar el componente compartido.

**Decisión de encabezado (detalle):** `PageHeader` recibe `title` como `string` puro, así que no admite inyectar un swatch dentro del `<h1>`. Para no modificar el componente compartido (`components/page-header.tsx` queda fuera de alcance), se reemplaza la llamada a `<PageHeader .../>` por el mismo markup que `PageHeader` produce — el contenedor `flex` con `<h1>` y descripción, más el slot de acciones — anteponiendo al título un swatch redondo de 10×10 con el `color_hex` de la propiedad. El resto de la página (`Stat`s, gráfico, tablas) no cambia. El import de `PageHeader` deja de usarse y se quita para evitar `no-unused-vars`.

**Files:**
- Modificar: `app/(admin)/properties/[id]/page.tsx`

- [ ] **Step 1: Editar `app/(admin)/properties/[id]/page.tsx`.** Reemplazar exactamente esta línea de import:

```tsx
import { PageHeader } from "@/components/page-header";
```

por (se elimina el import — `PageHeader` deja de usarse):

```tsx
```

(es decir, borrar la línea por completo.)

- [ ] **Step 2: Editar `app/(admin)/properties/[id]/page.tsx`.** Reemplazar exactamente este bloque del JSX:

```tsx
      <PageHeader
        title={property.name}
        description={property.address ?? "Sin dirección"}
        actions={
          <Button asChild variant="outline">
            <Link href={`/reservations/new?property=${property.id}`}>+ Nueva reserva</Link>
          </Button>
        }
      />
```

por:

```tsx
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-10 shrink-0 rounded-lg"
            style={{ backgroundColor: property.color_hex ?? "#A47148" }}
            aria-hidden
          />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{property.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {property.address ?? "Sin dirección"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/reservations/new?property=${property.id}`}>
              + Nueva reserva
            </Link>
          </Button>
        </div>
      </div>
```

Notas: el bloque reemplazante replica exactamente la estructura que produce `PageHeader` (contenedor `mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center`, `<h1 className="text-3xl font-semibold tracking-tight">`, descripción `mt-1 text-sm text-muted-foreground`, slot de acciones `flex flex-wrap items-center gap-2`) y le antepone un swatch de color de 10×10 (`h-10 w-10 rounded-lg`), del mismo estilo que el swatch de 9×9 de la tarjeta de la grilla. `components/page-header.tsx` no se toca. El import `PageHeader` se elimina porque ya no se usa (de lo contrario eslint marcaría `no-unused-vars`). El fallback `#A47148` ya se usa en otras partes del proyecto y se conserva; sin colores nuevos hardcodeados. El resto de la página de detalle queda idéntico.

- [ ] **Step 3: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/properties/[id]/page.tsx"` → sin errores ni warnings (en particular, sin `no-unused-vars` por el import de `PageHeader` removido).
  - `pnpm build` → build exitoso.
  - Esperado: en `/properties/<id>`, el encabezado muestra a la izquierda del nombre de la propiedad un swatch redondeado con el color de la propiedad, igual que el de la tarjeta de la grilla; la dirección y el botón "+ Nueva reserva" siguen en su lugar.

- [ ] **Step 4: Commit.**

```
git commit -m "feat(properties): swatch de color en el encabezado de la pagina de detalle"
```

---

## Task 3: Ajustes — formularios de propiedad compactos, aviso de cotización vieja y swatch de color

`SettingsClient` recibe tres cambios de jerarquía e interacción, todos dentro de `settings-client.tsx`:
1. **`PropertyForm` más compacto** — los formularios por propiedad son hoy muy largos: cada campo en `space-y-2`, la grilla `gap-4`, "Nombre" y "Dirección" ambos a ancho completo, y precio/limpieza/color en filas sueltas. Se compacta a una grilla más densa (`gap-3`, `space-y-1.5`) donde sólo "Nombre" queda a ancho completo y "Dirección" comparte fila; precio base, limpieza y color van en una fila de 3 columnas. Ningún campo se quita y `onSubmit`/`updatePropertyAction` no cambian.
2. **Aviso de cotización desactualizada en `RateForm`** — hoy `RateForm` muestra sólo "Última actualización: {fecha}". Se calcula con `differenceInDays` la antigüedad de `rate.updated_at` y, si supera los 7 días, se muestra un aviso de advertencia. Es presentacional; no se agrega dato nuevo.
3. **Swatch visible junto al picker de color** — el `<Input type="color">` se acompaña de un swatch redondo que refleja el valor actual, consistente con cómo el color de propiedad aparece en la grilla y en el encabezado de detalle.

**Decisión del umbral de cotización (Ajustes):** el umbral es **7 días**. Si `differenceInDays(hoy, rate.updated_at) > 7`, la línea "Última actualización" pasa a tono de advertencia y se agrega un renglón explicativo ("La cotización tiene más de una semana. Actualizala para que los montos en USD y EUR sean precisos."). Siete días es un umbral sensato para un alquiler turístico en Argentina, donde el tipo de cambio se mueve seguido; el cálculo usa el `updated_at` ya existente, sin dato ni query nuevos. Si `rate.updated_at` viene vacío (caso del fallback de `settings/page.tsx`, que igual pasa `new Date().toISOString()`), el cálculo da 0 días y no se muestra aviso.

**Decisión de compactación (`PropertyForm`):** sin quitar campos. Cambios: `CardHeader` mantiene el swatch + nombre + switch (ya compacto); el `<form>` pasa de `grid gap-4 md:grid-cols-2` a `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`; cada `div` de campo pasa de `space-y-2` a `space-y-1.5`; los `Label` reciben `text-xs`; "Nombre" ocupa toda la fila (`sm:col-span-2 lg:col-span-3`), "Dirección" ocupa una fila en pantallas chicas y comparte en grandes (`sm:col-span-2 lg:col-span-1`), y precio base / limpieza / color ocupan una columna cada uno; el botón "Guardar cambios" va a ancho completo de la grilla alineado a la derecha. El `CardContent` reduce su padding superior implícito vía `pt-0` (ya lo tiene el componente). Esto baja el alto de cada tarjeta de propiedad de forma notable sin perder ningún campo.

**Decisión del swatch de color:** el `<Input type="color">` se mantiene (es el picker nativo, sin cambiar la lógica de `register("color_hex")`), pero se envuelve junto a un `<span>` redondo cuyo `backgroundColor` se sincroniza con el valor del formulario vía `watch("color_hex")`. Así el color elegido se ve como swatch además del cuadradito del input nativo, consistente con la grilla de propiedades.

**Files:**
- Modificar: `app/(admin)/settings/settings-client.tsx`

- [ ] **Step 1: Reescribir `app/(admin)/settings/settings-client.tsx`** con exactamente este contenido:

```tsx
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
```

Notas: tres cambios, todos dentro de este archivo, sin tocar `actions.ts` ni los esquemas.
1. **`RateForm`**: se importan `AlertTriangle` de `lucide-react`, `differenceInDays` de `date-fns` y `toDate` de `lib/format.ts`. La antigüedad se calcula con `differenceInDays(new Date(), toDate(rate.updated_at))`; el umbral es la constante `RATE_STALE_DAYS = 7`. Si `isStale`, la línea "Última actualización" se reemplaza por un bloque con `border-warning/40 bg-warning/10` y el icono de advertencia; si no, queda el `<p>` de siempre. Cuando `rate.updated_at` está vacío (`""`), `ageDays` es `0` y nunca se muestra el aviso. El cálculo y la query de la cotización no cambian.
2. **`PropertyForm` compacto**: el `<form>` pasa de `grid gap-4 md:grid-cols-2` a `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`; cada campo pasa de `space-y-2` a `space-y-1.5` y los `Label` ganan `text-xs`. "Nombre" y "Dirección" ocupan toda la fila (`sm:col-span-2 lg:col-span-3`); precio base, limpieza y color ocupan una columna cada uno (en `lg` quedan en una sola fila de 3). El `CardHeader` gana `pb-3` y el `CardTitle` `text-base font-medium` para alinearlo con el resto del rediseño. Ningún campo se elimina; `register`, `onSubmit` y `updatePropertyAction` son idénticos al original.
3. **Swatch de color**: se agrega `watch` a la desestructuración de `useForm`; `currentColor` refleja en vivo `watch("color_hex")`. El `<Input type="color">` se envuelve en un `flex` junto a un `<span>` redondeado de 9×9 cuyo `backgroundColor` es `currentColor`, consistente con el swatch de la grilla de propiedades y del encabezado de detalle. La lógica del input (`register("color_hex")`) no cambia.
Sin colores hardcodeados nuevos: `#A47148` ya era el fallback del original; los tonos de aviso usan el token `warning`. Spanish rioplatense, sin emojis ni signos de exclamación.

- [ ] **Step 2: Verificar.** Ejecutar:
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(admin)/settings/settings-client.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.
  - Esperado: en `/settings`, pestaña "Tipos de cambio": si la última actualización tiene más de 7 días, aparece un aviso de advertencia con icono explicando que la cotización está vieja; si no, sigue la línea gris de siempre. Pestaña "Propiedades": cada formulario es más compacto — campos en una grilla de hasta 3 columnas, menos alto vertical, sin perder ningún campo; junto al picker de color hay un swatch redondeado que muestra el color seleccionado y se actualiza al cambiarlo.

- [ ] **Step 3: Commit.**

```
git commit -m "feat(settings): formularios de propiedad compactos, aviso de cotizacion vieja y swatch de color"
```

---

## Verificación final de la Fase 4C

- [ ] `pnpm typecheck` termina sin errores.
- [ ] `pnpm exec eslint "app/(admin)/properties/page.tsx" "app/(admin)/properties/[id]/page.tsx" "app/(admin)/settings/settings-client.tsx"` termina sin errores ni warnings.
- [ ] `pnpm build` termina exitosamente.
- [ ] Revisión visual de Propiedades (`/properties`):
  - Cada tarjeta de la grilla muestra, además de swatch de color, nombre y dirección, una grilla de 4 métricas (Precio base, Ocupación año, Ingresos mes, Ingresos YTD) y una fila inferior separada "Próxima reserva" con la fecha de la próxima reserva activa o "Sin próximas".
  - Las tres métricas nuevas se derivan de las reservas ya traídas por la página; no hay ninguna query nueva.
- [ ] Revisión visual del detalle de propiedad (`/properties/<id>`):
  - El encabezado muestra a la izquierda del nombre un swatch de color del mismo color que la tarjeta de la grilla.
  - La dirección, el botón "+ Nueva reserva", los `Stat`s, el gráfico y las tablas siguen sin cambios.
- [ ] Revisión visual de Ajustes (`/settings`):
  - Pestaña "Tipos de cambio": cuando la última actualización supera los 7 días, se muestra un aviso de advertencia con icono y texto explicativo; cuando no, queda la línea gris habitual.
  - Pestaña "Propiedades": los formularios son visiblemente más compactos (grilla de hasta 3 columnas, menos espaciado vertical) y conservan todos los campos (Nombre, Dirección, Precio base, Limpieza, Color, switch Activa/Inactiva).
  - Junto al picker de color hay un swatch redondeado que refleja el color seleccionado, consistente con la grilla de propiedades y el encabezado de detalle.
- [ ] Sin cambios de base de datos, de queries, de server actions ni de lógica de negocio.
- [ ] Spanish rioplatense, sin emojis ni signos de exclamación en la UI.
