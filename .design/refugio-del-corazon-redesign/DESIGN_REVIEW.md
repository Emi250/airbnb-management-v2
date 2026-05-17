# Design Review: Rediseño completo — Refugio del Corazón

Reviewed against: `docs/superpowers/specs/2026-05-16-refugio-del-corazon-redesign-design.md`
Philosophy: Calmo, minimalista, editorial — base neutra cálida + acento teal. Geist.
Date: 2026-05-16
Scope: las 7 fases del rediseño (tokens/marca, calendario, dashboard, reservas+huéspedes, gastos+reportes, propiedades+ajustes, agenda).

## Screenshots Captured

> **Pendiente.** La app está protegida por autenticación (middleware redirige a `/login`).
> No puedo capturar las pantallas internas sin credenciales de Supabase y una sesión
> iniciada. Esta revisión cubre a fondo la capa de código; la capa visual queda pendiente
> de que el dueño aporte capturas (ver "Pendiente: revisión visual" al final).

## Summary

El rediseño está implementado de forma consistente y fiel al spec: un único sistema de
tokens (`app/globals.css`) gobierna color y tipografía, y todas las páginas heredan por
cascada. El calendario —la pantalla clave— quedó reconstruido exactamente como se diseñó.
La calidad de código es alta: `typecheck` y `build` pasan, la accesibilidad es sólida
(roles ARIA, foco visible, `prefers-reduced-motion`, objetivos táctiles ≥44px). El hallazgo
principal es de **consistencia de paleta**: quedan varios usos de `emerald-500` crudo
(verde de Tailwind) en lugar del token `--success` del sistema nuevo — funcionan, pero no
acompañan el modo oscuro ni la identidad teal con la misma prolijidad que el resto.

## Must Fix

Ninguno detectable por revisión de código. `typecheck` y `build` pasan en todas las fases;
no hay imports rotos, componentes duplicados ni regresiones de lógica. Confirmar que no
haya "must fix" visuales requiere las capturas pendientes.

## Should Fix

> **Estado: resueltos** (commit `dbe92ea`). Ambos ítems fueron corregidos y pusheados.

1. **Verde crudo `emerald-500` en lugar del token `--success`.** ✓ Resuelto El sistema nuevo define
   un token `--success` (verde) para claro y oscuro, y el calendario ya lo usa
   (`bg-success`). Pero quedaron usos del verde fijo de Tailwind que no cambian con el modo
   oscuro ni comparten el tono del sistema:
   - `components/ui/badge.tsx:14` — la variante `success` del Badge usa
     `bg-emerald-500/10 text-emerald-500`.
   - `app/(admin)/expenses/fixed-checklist.tsx:157,171` — estado "pagado" del checklist
     (`border-emerald-500/40 bg-emerald-500/5`, `bg-emerald-500 text-white`).
   - `app/(admin)/expenses/expenses-view.tsx:301` — delta negativo del KPI
     (`text-emerald-500`).
   - `app/(admin)/properties/[id]/page.tsx:249` — acento positivo de los Stats.
   _Fix: reemplazar por el token — `bg-success/10 text-success`, `bg-success
   text-success-foreground`, `text-success`. Es un cambio chico y unifica la paleta en
   claro y oscuro._

2. **`min-h-screen` en pantallas auxiliares.** ✓ Resuelto — `min-h-[100dvh]` aplicado en
   `agenda/loading.tsx`, `login/page.tsx`, `error.tsx`, `not-found.tsx` y `admin-shell.tsx`.

## Could Improve

1. **Paleta de categorías de gasto.** `components/charts/expense-donut.tsx:10-15` usa un
   set genérico (azul `#60a5fa`, ámbar, verde, violeta, rojo) que es anterior al rediseño
   y no dialoga con la identidad teal/terracota/ciruela del sistema nuevo. Funciona como
   paleta categórica distinguible, pero podría rearmonizarse con los tonos del sistema
   para que Gastos se sienta parte del mismo universo visual. _Sugerencia: derivar los
   colores de categoría de los hues del sistema (chart-1..5)._

2. **Distinción de departamento depende de colores saturados.** Las etiquetas y bordes de
   departamento usan `property.color_hex` crudo; si alguien cargara desde Propiedades un
   color muy claro, el contraste de la etiqueta y la fuerza del borde caerían. Los 4
   colores actuales (terracota/azul/verde/ciruela) están bien. _Sugerencia: validar o
   normalizar la luminancia del `color_hex` al guardarlo, en una fase futura._

3. **Aviso de cotización desactualizada.** El umbral de 7 días en Ajustes es razonable;
   considerar a futuro mostrar también un aviso suave en el Dashboard si la cotización
   está vieja y hay montos en USD/EUR visibles.

## What Works Well

- **Sistema de tokens único y completo.** `app/globals.css` define toda la paleta en
  OKLCH para claro y oscuro; los componentes consumen `--background`, `--primary`,
  `--success`, etc. El cambio de índigo frío a base cálida + teal se hizo en un solo lugar
  y cascadeó a toda la app. Tipografía Geist vía `next/font`, números en JetBrains Mono
  con cifras tabulares.
- **Calendario fiel al diseño aprobado.** Lista por día de llegada, una entrada por
  reserva, distinción de departamento con borde grueso + etiqueta sólida, fechas/noches/
  huéspedes/celular, botones Llamar y WhatsApp, sin montos. Encabezados de día con "Hoy" y
  "en N días". Helpers puros aislados en `lib/calendar.ts`.
- **Jerarquía del Dashboard.** Un KPI héroe + tres de apoyo, un solo gráfico, y análisis
  por departamento como lista con encabezados de columna (se evitó la ambigüedad del %).
- **Patrones reutilizables.** `ContactActions` y `SortableHeader` se crearon una vez y se
  reutilizan en Reservas y Huéspedes — sin duplicación.
- **Accesibilidad.** `aria-sort` en la celda columnheader, `aria-label` en íconos y
  acciones, `aria-pressed` en toggles, `aria-live` en contadores, anillos de foco desde
  `--ring`, `prefers-reduced-motion` respetado globalmente (`globals.css:154`), objetivos
  táctiles ≥44px en acciones de contacto y botones del calendario. El color nunca es la
  única señal (etiquetas con texto).
- **Sin parpadeo de tema.** Script anti-flash en `app/layout.tsx` aplica el tema antes del
  primer paint.
- **Disciplina de alcance.** Cero cambios de esquema de base de datos, de lógica de
  negocio, de queries o de exportación CSV en ninguna fase. Re-skin in-place puro.

## Pendiente: revisión visual

Para completar la revisión necesito capturas de la app corriendo y con sesión iniciada.
Lo ideal: cada pantalla en **escritorio (1280px)** y **celular (375px)**, en **modo claro y
oscuro**. Prioridad por importancia:

1. **Calendario** (la pantalla de tu mamá) — escritorio y celular, claro y oscuro.
2. **Dashboard** — escritorio.
3. **Reservas** (con filtros abiertos y cerrados) y **Huéspedes** — escritorio y celular.
4. **Gastos** y **Reportes** — escritorio.
5. **Propiedades**, **Ajustes**, **Agenda**, **Login** — escritorio.

Guardalas en `.design/refugio-del-corazon-redesign/screenshots/` o pegámelas en el chat, y
completo el análisis visual (jerarquía, espaciado, contraste real, adaptación responsive).
