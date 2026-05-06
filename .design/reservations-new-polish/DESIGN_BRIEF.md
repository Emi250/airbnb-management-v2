# Design Brief: Reservations New Polish

> Polish editorial del formulario de carga/edición de reservas (`/reservations/new` y `/reservations/[id]`). Extiende — no reemplaza — el sistema de diseño consolidado en [.design/dashboard-redesign/DESIGN_BRIEF.md](../dashboard-redesign/DESIGN_BRIEF.md) y [DESIGN_TOKENS.md](../dashboard-redesign/DESIGN_TOKENS.md).

## Problem

Hoy el formulario es funcionalmente sólido pero visualmente genérico. Cuatro tarjetas idénticas (`rounded-xl border bg-card p-6`) con headings en mayúsculas muted se apilan dentro de un `max-w-3xl`. Tres síntomas:

1. **Sin jerarquía.** Las cuatro secciones tienen el mismo peso visual aunque cargan información de criticidad muy distinta — propiedad y fechas son obligatorias y bloqueantes; las notas son opcionales.
2. **Cómputos enterrados.** Noches, precio por noche y saldo se calculan en vivo pero viven dentro de la sección Importes con borde dashed y tipografía muy quieta. Es justo la información que más mira el operador y la que menos visible queda.
3. **Pares no agrupados.** Check-in/check-out son una sola decisión (la estadía); estado y canal son metadata operativa; no hay agrupación visual que lo refleje. Cada campo flota igual al de al lado.

Y, sobre todo: el formulario no transmite que pertenece al mismo producto que el nuevo `/dashboard`. La estética calma editorial (Stripe/Linear) no llegó a esta pantalla todavía.

## Solution

Un formulario que se siente parte del mismo sistema, con jerarquía editorial por bloque, agrupaciones que reflejan decisiones reales del operador, y feedback en vivo elevado a hero numérico. Cero cambio funcional: mismos campos, mismo schema zod, mismas server actions, mismas rutas.

Concretamente: numeración editorial de secciones (`01 ·`), headings sentence-case con tracking-tight, agrupación de fechas bajo "Estadía" con chip de noches inline, separación visual del bloque `Notas` (sin chrome de card — solo border-top), preview de moneda formateada bajo cada input numérico de importe, banner de cómputos vivo con tipografía hero (`text-2xl font-semibold tabular-nums`) y semáforo sutil para el saldo (success cuando está cobrado).

## Experience Principles

1. **Heredar, no reinventar.** El brief, los tokens y la philosophy ya existen — todo viene del sistema del dashboard. Si una decisión no está cubierta por los tokens, la decisión es no inventarla y volver al patrón ya validado.
2. **Jerarquía editorial sobre chrome uniforme.** El peso visual lo da la tipografía y el espaciado. No agregamos más bordes, sombras o cards para distinguir bloques — los retiramos donde sobran (Notas) y los elevamos donde aportan (banner de cómputos).
3. **Cómputos en vivo, no enterrados.** Noches y saldo son el feedback más cargado de información del form. Tienen que verse mientras el operador edita los importes, no esconderse al final de una sección.

## Aesthetic Direction

- **Philosophy**: Calm editorial financial — heredada de [dashboard-redesign/DESIGN_BRIEF.md](../dashboard-redesign/DESIGN_BRIEF.md). Type-driven hierarchy, generous whitespace, neutral foundation, restrained semantic color.
- **Tokens**: Los activos en [app/globals.css](../../app/globals.css). Indigo primary (hue 268), neutrales hue 270, semánticos `success` / `warning` / `destructive` ya documentados.
- **Reference points**: Stripe Dashboard form patterns, Linear's issue create modal, Vercel project settings.
- **Tone**: Confident, quiet, professional. Spanish UI, Rioplatense register. No exclamaciones, no emoji, no tooltips defensivos.

## Existing Patterns Reused

- **Componentes shadcn/ui**: `Button`, `Input`, `Label`, `Textarea`, `Switch`, `Select` ([components/ui/](../../components/ui/)) — sin tocar.
- **Layout**: `PageHeader` ([components/page-header.tsx](../../components/page-header.tsx)) ya emite el `text-3xl font-semibold tracking-tight` editorial. Reuso directo.
- **Utilidades**: `formatCurrency` ([lib/format.ts](../../lib/format.ts)) para los previews de moneda. `STATUS_LABEL`, `SOURCE_LABEL` ([lib/reservation-options.ts](../../lib/reservation-options.ts)) para los labels de los selects.
- **Tabular nums**: clase global `.numeric` y selector `td.numeric` ([app/globals.css](../../app/globals.css)) — usar también `tabular-nums` directamente cuando sea más expresivo.

## Component Inventory

| Component | Status | Notes |
| --- | --- | --- |
| `ReservationForm` ([app/(admin)/reservations/reservation-form.tsx](../../app/(admin)/reservations/reservation-form.tsx)) | Modify | Único archivo con cambios sustanciales. Polish editorial, sin nueva lógica. |
| `NewReservationPage` ([app/(admin)/reservations/new/page.tsx](../../app/(admin)/reservations/new/page.tsx)) | Modify | Cambia el `max-w` del contenedor. Suaviza el `description` del `PageHeader`. |
| `ReservationDetailPage` ([app/(admin)/reservations/[id]/page.tsx](../../app/(admin)/reservations/[id]/page.tsx)) | Modify | Mismo `max-w` por consistencia, dado que comparte `ReservationForm`. |
| `Tile` (interno en [id]/page.tsx) | Hold | Se evalúa si se restila para empatar el banner de cómputos del form. Si no aporta, queda como está. |

## Key Interactions

**Crear reserva (golden path).** El operador llega desde "Nueva reserva". Lee el `PageHeader` editorial, escanea las secciones numeradas, completa propiedad → estadía → huésped → importes. Mientras carga importes, el banner de cómputos arriba del cuerpo de Importes se actualiza en vivo: noches (calculadas desde fechas), por noche (total / noches), saldo (total - pagado). Submit. Toast "Reserva creada", redirect a `/reservations/<id>`.

**Editar reserva.** Mismo formulario, ya cargado. Los cómputos se ven desde el primer paint. Si el saldo es cero o negativo, aparece en `text-success` con micro-label "Cobrado"; si es positivo, en `text-foreground` con "Pendiente". Al modificar `pagado`, el semáforo se ajusta sin animación.

**Crear huésped nuevo.** El toggle pills (Existente / Nuevo) hace explícito el modo. Si no hay huéspedes en la base, se muestra el mini-empty-state arriba del bloque y el modo arranca en "Nuevo" (comportamiento ya existente).

**Validación.** Los errores de zod aparecen inline bajo el campo en `text-xs text-destructive` con un punto `•` antepuesto y `aria-live="polite"` en el contenedor. No hay banner global de errores — la inline ya es suficiente y consistente con el resto del producto.

**Cancelar reserva (solo edit).** El botón rojo `destructive` permanece; el `confirm()` del browser se mantiene (no se cambia a Dialog en este polish — eso sería refactor funcional).

## Responsive Behavior

- **≥1280px**: contenedor `max-w-4xl`. Grids en 3 columnas (Estadía: check-in / check-out / huéspedes; Clasificación: estado / canal / vacío). Banner de cómputos en 3 columnas. Footer alineado a la derecha.
- **≥768px (tablet)**: 2 columnas en grids de 3 (envuelve el último ítem). Banner de cómputos sigue en 3 columnas. Footer derecha.
- **<768px (mobile)**: single column. Banner de cómputos en 3 columnas estrechas (los números son cortos). Footer apilado: botón principal full-width arriba, "Volver" como link textual debajo.

## Accessibility Requirements

- WCAG 2.1 AA en light y dark — los tokens `success`, `warning`, `destructive` ya cumplen sobre `background` y `card`. Verificación manual del semáforo de saldo (ratio ≥ 4.5:1 sobre `card`).
- Color nunca como único signal: el saldo lleva además del color un micro-label textual ("Cobrado" / "Pendiente"). Las secciones llevan número + título textual.
- Errores con `aria-live="polite"` para que screen readers anuncien el cambio sin interrumpir.
- Tab order: propiedad → check-in → check-out → huéspedes → estado → canal → toggle Existente/Nuevo → campos de huésped → importes (total → pagado → comisión → limpieza) → notas → Volver → Crear/Guardar.
- Focus rings vienen de `--ring` (token), 2px de outline visible.

## Out of Scope

- **Schema, validación, server actions** ([lib/schemas.ts](../../lib/schemas.ts), [actions.ts](../../app/(admin)/reservations/actions.ts), [lib/queries/reservations.ts](../../lib/queries/reservations.ts)) — no se tocan.
- **Tipos de Supabase** ([types/supabase.ts](../../types/supabase.ts)) — no se tocan.
- **Componentes ui shadcn** ([components/ui/](../../components/ui/)) — solo se consumen.
- **Globals CSS / tokens** — los actuales del dashboard cubren todo. No se agregan tokens nuevos.
- **Reemplazar `confirm()` por `Dialog` en cancelar** — refactor funcional; queda fuera.
- **Tabla, filtros, listado de reservas** — pantallas vecinas, no entran en este pase.
- **Wizard / flujo en pasos** — descartado en la decisión de profundidad. Polish editorial mantiene single-form.
- **Sticky summary lateral** — descartado en la decisión de profundidad. El banner de cómputos vive dentro de la sección Importes.
