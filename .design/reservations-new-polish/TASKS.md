# Tasks: Reservations New Polish

> Build checklist para el polish editorial. Todas las tareas son cambios de marcado/clases sobre archivos existentes. Cero nuevos componentes, cero cambios de schema.

## Archivo principal

[app/(admin)/reservations/reservation-form.tsx](../../app/(admin)/reservations/reservation-form.tsx)

## Convenciones

- **Patrón de cabecera de sección** (reusable inline, sin extraer componente todavía):
  ```tsx
  <header className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground tabular-nums">{stepNumber} · {kicker}</p>
    <h2 className="text-base font-semibold tracking-tight">{title}</h2>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </header>
  ```
- **Container de sección**: `rounded-xl border border-border bg-card p-6 space-y-6` (sube el `space-y` de 4 a 6 — más editorial).
- **Grid base**: `grid gap-4 md:grid-cols-3` se mantiene; subimos a `gap-5` para micro-aire extra.
- **Patrón de error inline**:
  ```tsx
  <div aria-live="polite" className="min-h-0">
    {errors.field && (
      <p className="flex items-center gap-1.5 text-xs text-destructive">
        <span aria-hidden>•</span>
        {errors.field.message}
      </p>
    )}
  </div>
  ```
- **Preview de moneda formateada** (debajo del input numérico):
  ```tsx
  <p className="text-xs text-muted-foreground tabular-nums">
    {formatCurrency(Number(watched ?? 0))}
  </p>
  ```

## Tasks

- [ ] **1. Cabecera de sección editorial.** Reemplazar los cuatro `<h2 className="text-sm font-semibold uppercase text-muted-foreground">` por el patrón de cabecera con número de paso (`01`, `02`, `03`, `04`) y título sentence-case:
  - `01 · Reserva` → "Propiedad y estadía" + soporte: "Definí qué propiedad y cuándo se ocupa."
  - `02 · Huésped` → "Huésped" + soporte: "Asociá un huésped existente o creá uno nuevo."
  - `03 · Pagos` → "Importes" + soporte: "Todo en pesos. El saldo se calcula automáticamente."
  - `04 · Notas` → "Notas internas" (sin soporte; opcional).

- [ ] **2. Sección 1 — agrupar Estadía.** Reorganizar la sección `Propiedad y fechas`:
  - Propiedad como bloque full-width (no en grid de 3) para reflejar que es la decisión gobierno.
  - Sub-bloque "Estadía" con header secundario (`text-sm font-medium tracking-tight` + chip `· N noches` cuando `nights > 0`, en `text-xs tabular-nums text-muted-foreground` con `bg-muted/60 px-2 py-0.5 rounded-full`).
  - Sub-bloque "Clasificación" con header secundario, contiene `Estado` y `Canal` como par de selects (grid de 2).
  - El campo `Huéspedes (num_guests)` queda dentro de Estadía junto a check-in y check-out (grid de 3). Mantiene min=1.

- [ ] **3. Sección 2 — Huésped con toggle pills.** Reemplazar el `Switch + label "Crear nuevo huésped"` por dos botones tipo pill:
  - Botón "Existente" / Botón "Nuevo" en un contenedor `inline-flex items-center rounded-full border bg-muted/40 p-0.5 text-xs`.
  - El activo usa `bg-card text-foreground shadow-sm`; el inactivo `text-muted-foreground hover:text-foreground`.
  - Estado controlado: sigue siendo `createGuest` / `setCreateGuest` (sin cambios de comportamiento). Sin Switch.
  - Cuando `guests.length === 0`, mostrar arriba del toggle: `<p className="text-xs text-muted-foreground">Aún no tenés huéspedes guardados — completá los datos abajo.</p>` y forzar `createGuest=true` por defecto (ya lo hace).

- [ ] **4. Sección 3 — Importes con preview.** Cada uno de los cuatro inputs numéricos (Total, Pagado, Comisión, Limpieza) muestra debajo el valor formateado vía `formatCurrency` en `text-xs text-muted-foreground tabular-nums`. Solo lectura; el número viene del `watch()` ya en uso. Si el valor es `0`, mostrar `formatCurrency(0)` (`$0,00`) — no esconderlo.

- [ ] **5. Banner de cómputos vivo.** Reemplazar el bloque dashed `<div className="grid grid-cols-3 gap-3 rounded-lg border border-dashed border-border p-4 text-center">` por:
  ```tsx
  <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-5">
    <div className="space-y-1 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Noches</p>
      <p className="text-2xl font-semibold tabular-nums">{nights || "—"}</p>
    </div>
    <div className="space-y-1 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Por noche</p>
      <p className="text-2xl font-semibold tabular-nums">{nights ? formatCurrency(pricePerNight) : "—"}</p>
    </div>
    <div className="space-y-1 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Saldo</p>
      <p className={cn("text-2xl font-semibold tabular-nums", balance <= 0 && total > 0 && "text-success")}>
        {total > 0 ? formatCurrency(balance) : "—"}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {total === 0 ? "Cargá total" : balance <= 0 ? "Cobrado" : "Pendiente"}
      </p>
    </div>
  </div>
  ```
  Importar `cn` desde `@/lib/utils` si no está ya.

- [ ] **6. Sección 4 — Notas livianas.** Quitar el envoltorio `rounded-xl border border-border bg-card p-6 space-y-4`. Pasar a:
  ```tsx
  <section className="border-t border-border pt-6 space-y-3">
    <header className="space-y-1"> ... 04 · Notas internas ... </header>
    <Textarea rows={3} {...register("notes")} placeholder="Información adicional..." />
  </section>
  ```

- [ ] **7. Validación inline mejorada.** Aplicar el patrón `aria-live="polite"` y `flex items-center gap-1.5` con punto a TODOS los errores actuales del form:
  - `errors.property_id`
  - `errors.check_in`
  - `errors.check_out`
  - `errors.amount_paid_ars`
  - `errors.guest_id`
  - (cualquier otro que ya emita zod en runtime)

- [ ] **8. Footer responsivo.** Cambiar el footer de acciones:
  - Desktop (`md:`): mantener `flex flex-wrap items-center justify-end gap-2` con orden Cancelar reserva (edit) → Volver → Submit.
  - Mobile: apilado vertical. Submit primero (full-width), Volver debajo como link `variant="link"`. Cancelar reserva en su orden si edit.
  - Implementar con `flex flex-col-reverse gap-3 md:flex-row md:justify-end md:items-center` y dejar que el orden DOM ya quede correcto (Volver antes de Submit en DOM → en mobile aparece Submit arriba por `flex-col-reverse`).

- [ ] **9. Espaciado del form.** Subir `space-y-6` raíz a `space-y-8` para que las secciones respiren más.

- [ ] **10. Wrapper de página y ancho.**
  - [app/(admin)/reservations/new/page.tsx](../../app/(admin)/reservations/new/page.tsx): `max-w-3xl` → `max-w-4xl`. Suavizar `description` a `"Completá los datos para crear la reserva"`.
  - [app/(admin)/reservations/[id]/page.tsx](../../app/(admin)/reservations/[id]/page.tsx): `max-w-3xl` → `max-w-4xl`. Sin más cambios (el `Tile` y la metadata de creación quedan como están).

## Build verification (Phase 6 cierre)

1. `npm run build` — debe compilar sin warnings nuevos de TS.
2. Smoke en dev (`npm run dev`):
   - `/reservations/new` carga, las cuatro secciones se ven con la nueva jerarquía.
   - Cargo fechas válidas → noches aparece. Cargo total → saldo aparece. Saldo cae a 0 → cambia a `text-success` con label "Cobrado".
   - Toggle Existente/Nuevo cambia el sub-form sin romper.
   - Submit con un campo requerido vacío → error inline con punto, sin romper layout.
   - Submit válido → redirect a `/reservations/<id>` y toast.
   - `/reservations/<id>` carga el form con datos prefijados; el banner de cómputos muestra valores reales desde el primer paint.
3. Responsive (devtools): 1280 / 768 / 375. Footer en mobile tiene Submit arriba full-width.
4. Dark mode: togglear; success y muted siguen legibles.
