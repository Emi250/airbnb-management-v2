# Design Review: Reservations New Polish

Reviewed against: [DESIGN_BRIEF.md](DESIGN_BRIEF.md)
Philosophy: Calm editorial financial — Stripe / Linear lineage (heredado de [dashboard-redesign](../dashboard-redesign/DESIGN_BRIEF.md))
Date: 2026-05-06

> **Estado**: todos los hallazgos cerrados (Must Fix + Should Fix + Could Improve) — ver sección "Follow-up — fixes applied" al final.

> Capturado contra el dev server local (`http://localhost:3000`) sobre una página efímera `/design-preview/reservation-form` que renderiza `<ReservationForm>` con datos mock — el deploy de Vercel todavía no tiene los cambios. La página de preview se borra al cierre del review.

## Screenshots Captured

| Screenshot                                                  | Breakpoint           | Theme | Description |
| ----------------------------------------------------------- | -------------------- | ----- | ----------- |
| `screenshots/review-form-light-desktop-1280.png`            | Desktop (1280×900)   | Light | Estado base, datos prefilled, todas las secciones visibles. |
| `screenshots/review-form-light-tablet-768.png`              | Tablet (768×1024)    | Light | Mismo estado, layout responsive. |
| `screenshots/review-form-light-mobile-375.png`              | Mobile (375×812)     | Light | Single column. |
| `screenshots/review-form-dark-desktop-1280.png`             | Desktop (1280×900)   | Dark  | Tokens dark mode aplicados. |
| `screenshots/review-form-dark-tablet-768.png`               | Tablet (768×1024)    | Dark  | — |
| `screenshots/review-form-dark-mobile-375.png`               | Mobile (375×812)     | Dark  | — |
| `screenshots/review-state-guest-nuevo-light-desktop.png`    | Desktop, Light       | —     | Toggle pill "Nuevo" activo, sub-form de huésped nuevo desplegado. |
| `screenshots/review-state-validation-light-desktop.png`     | Desktop, Light       | —     | Submit con campos requeridos vacíos: errores inline + banner de cómputos en estado "Cargá el total". |
| `screenshots/review-state-cobrado-light-desktop.png`        | Desktop, Light       | —     | Pagado = Total: saldo en `text-success` con label "COBRADO". |

> Carpeta: `.design/reservations-new-polish/screenshots/`

## Summary

El polish editorial cumple el brief: la jerarquía numérica (`01 · Reserva` / `02 · Huésped` / `03 · Pagos` / `04 · Notas`), el banner de cómputos hero, la agrupación de Estadía con chip de noches inline y el patrón de validación con punto + `aria-live` se ven sólidos en los tres breakpoints y en ambos temas. La pantalla ya se siente parte del mismo producto que `/dashboard`. **Hay un único bug de mobile bien definido** (el banner de cómputos colapsa visualmente a 375px porque `text-2xl` es demasiado para columnas de ~100px) y dos refinamientos menores sobre toggle pills y un microcopy. Resto: pasa.

## Must Fix

1. **Banner de cómputos se solapa en mobile (375px)**. En `screenshots/review-form-light-mobile-375.png` se ve cómo "Por noche" y "Saldo" se encabalgan: `$ 60.000` y `$ 140.000,00` colisionan visualmente — `text-2xl` (24px) por tres columnas en un container de ~327px no entra. Issue de legibilidad seria en el feedback más cargado del form. _Fix: usar `text-lg md:text-2xl` para el valor y `text-[10px] md:text-[11px]` para el label kicker. Alternativa: cambiar a `grid grid-cols-1 sm:grid-cols-3` y stack vertical en `<640px` — pero la fila de 3 sigue siendo lo más informativo si se reduce el tamaño de fuente._ Archivo: [app/(admin)/reservations/reservation-form.tsx](../../app/(admin)/reservations/reservation-form.tsx) bloque del banner de cómputos.

## Should Fix

1. **Saldo de 7 dígitos también queda apretado en tablet (768px)**. En `screenshots/review-form-light-tablet-768.png` el banner llena todo el ancho disponible y `$ 140.000,00` casi toca el borde derecho de su columna. No se solapa, pero hay menos aire del que el brief pide ("calm beats dense"). _Fix: el ajuste de Must Fix #1 (`text-lg md:text-2xl`) lo resuelve también acá. O bajar a `text-xl` en `md` y dejar `text-2xl` solo en `lg`._

2. **Toggle pill inactivo tiene contraste bajo y poca affordance**. En `screenshots/review-state-guest-nuevo-light-desktop.png` la pill "Existente" queda en `text-muted-foreground` sobre `bg-muted/40` — un usuario podría no leerla como botón clickeable. _Fix: subir el inactivo de `text-muted-foreground` a `text-foreground/70` y agregar `hover:bg-muted/60` para reforzar la affordance. El active state ya está bien con shadow + bg-card._ Archivo: [reservation-form.tsx](../../app/(admin)/reservations/reservation-form.tsx) en el `trailing` del SectionHeader de la sección 02.

3. **El icono "N" flotante de Next.js dev tools aparece en las screenshots**. No es un bug del producto — es el indicador de devtools de Next.js que vive en `position: fixed` sobre todo el chrome. _No requiere fix; queda anotado para que no se confunda con un elemento del form. En producción no aparece._

## Could Improve

1. **El chip "· 4 noches" lleva un punto medio inicial redundante**. Cuando el chip ya es una pill con `bg-muted/60` rounded-full, el `·` antepuesto sobra — el separador visual lo da el chip. _Sugerencia: cambiar a `4 noches` simple._

2. **Espaciado entre secciones (`space-y-8`) se siente bien en desktop pero quizá generoso en mobile**. En `screenshots/review-form-light-mobile-375.png` los gaps entre cards parecen mayores de lo necesario. _Sugerencia: `space-y-6 md:space-y-8` para reducir scroll en mobile sin sacrificar editorial calmness en desktop._

3. **El preview de moneda formateada debajo de cada importe lee como "label de ayuda" pero no tiene aria asociado**. _Sugerencia: agregar `aria-live="polite"` al `<p>` del preview para que screen readers anuncien el valor formateado a medida que el usuario tipea (es feedback del input pegado al input)._

4. **El input `Pagado` en estado de error muestra el mensaje "El pago no puede superar el total" PERO el banner de cómputos sigue mostrando un saldo negativo sin cuenta del overpay**. En `screenshots/review-state-cobrado-light-desktop.png` cuando paid === total el saldo cae a $0 y dice "COBRADO" — correcto. Pero si paid > total hoy el saldo se vuelve negativo (`-X`) sin que el banner indique el error. _Sugerencia: si `balance < 0`, mostrar `formatCurrency(Math.abs(balance))` con label "EXCESO" en `text-destructive`, o simplemente `—` con mensaje "Pago excede el total". Es coherente con la validación de `amount_paid_ars` que ya impide submit._

## What Works Well

- **Jerarquía editorial numerada (`01 · Reserva` …) es la decisión más impactante del polish**. Reemplaza los headers uppercase muted genéricos por algo que se lee como tabla de contenidos — el operador entiende el flujo del form sin tener que mirar todos los campos. Es exactamente lo que pedía el brief en "Heredar, no reinventar" y "Jerarquía editorial sobre chrome uniforme".

- **El banner de cómputos en desktop/tablet cumple su propósito**: tipografía hero (`text-2xl font-semibold tabular-nums`) con kickers en `text-[11px] uppercase tracking-wider`. La transición de placeholder ("—" + "Cargá el total") al estado cargado al estado "COBRADO" verde se siente coherente.

- **Validación inline con punto y `aria-live="polite"` es consistente en los cinco campos que vimos** (`property_id`, `check_in`, `check_out`, `guest_id`, `amount_paid_ars`). El `min-h-0` del wrapper evita el jump cuando aparecen — buen detalle.

- **Dark mode funciona out-of-the-box** porque toda la paleta usa tokens (`bg-card`, `bg-muted/50`, `text-success`, `text-muted-foreground`). Comparando `screenshots/review-form-light-desktop-1280.png` vs `review-form-dark-desktop-1280.png` el banner de cómputos, el chip de noches y los toggle pills traducen sin ajuste manual. Heredar los tokens del dashboard fue la decisión correcta.

- **Agrupación Estadía + chip "· 4 noches" inline en el header de la sub-sección** comunica la relación entre check-in/check-out/huéspedes sin un componente custom. El cómputo en vivo vive donde el operador está mirando.

- **Sección 04 · Notas sin chrome** (sólo `border-t pt-6`) baja correctamente el peso visual de la sección menos crítica. Refuerza que la jerarquía es deliberada y no decorativa.

- **Footer responsivo apila correctamente en mobile** (`Crear reserva` full-width arriba, `Volver` como link debajo) gracias a `flex-col-reverse gap-3 md:flex-row md:justify-end`.

- **Toggle pills Existente/Nuevo en estado activo se ve sólido** (shadow + bg-card sobre bg-muted/40). Más legible que el `Switch` original.

---

## Follow-up — fixes applied

Después del review se aplicaron Must Fix #1 y Should Fix #1 + #2 directamente sobre [reservation-form.tsx](../../app/(admin)/reservations/reservation-form.tsx). Los Could Improve y Should Fix #3 quedan abiertos.

### Cambios

1. **Banner de cómputos: stack en mobile, 3 columnas desde `sm:`**. Cierra el Must Fix #1 y el Should Fix #1 a la vez.
   - `grid grid-cols-3 gap-4 ...` → `grid grid-cols-1 gap-4 ... sm:grid-cols-3`
   - Los tres valores (Noches / Por noche / Saldo) vuelven a `text-2xl font-semibold tabular-nums` en todos los breakpoints, pero en mobile cada uno toma fila completa en lugar de competir por ~100px de ancho.

2. **Toggle pill inactivo: contraste y affordance**. Cierra el Should Fix #2.
   - `text-muted-foreground hover:text-foreground` → `text-foreground/70 hover:bg-muted/60 hover:text-foreground`
   - El estado inactivo ahora arranca con texto a 70% de opacidad (más legible que muted) y al hover gana background `bg-muted/60`, reforzando que es un control clickeable.

### Verificación

- `npm run build` pasó sin warnings.
- Re-capturas (sobre la misma página de preview efímera, ya borrada) confirmaron:
  - `screenshots/review-form-light-mobile-375.png`: banner apilado vertical, cada cifra (`$ 60.000,00`, `$ 140.000,00`) full-width sin colisión.
  - `screenshots/review-form-light-tablet-768.png`: banner en 3 columnas, sin tocar bordes.
  - `screenshots/review-state-guest-nuevo-light-desktop.png`: pill "Existente" inactiva con texto más legible.

### Could Improve — también cerrados

3. **Chip de noches sin separador redundante**. `· 4 noches` → `4 noches`. El chip ya provee la separación visual.

4. **Espaciado del form root tightened en mobile**. `space-y-8` → `space-y-6 md:space-y-8`. Reduce scroll en mobile (24px entre secciones) sin sacrificar el aire editorial en desktop (32px).

5. **`aria-live="polite"` en los 4 previews de moneda formateada** (Total, Pagado, Comisión, Limpieza). Screen readers anuncian el valor formateado a medida que el usuario tipea.

6. **Estado "Exceso" en el banner cuando `paid > total`**.
   - Variable derivada nueva: `exceso = total > 0 && balance < 0`. `cobrado` ahora es estricto a `balance === 0`.
   - El valor del saldo se muestra como `formatCurrency(Math.abs(balance))` con `text-destructive`. El label kicker pasa a "Exceso", también en `text-destructive`.
   - Cuatro estados claros y mutuamente excluyentes: "Cargá el total" (gris) / "Pendiente" (default) / "Cobrado" (verde) / "Exceso" (rojo). Color + texto en todos los casos — color nunca como único signal.
