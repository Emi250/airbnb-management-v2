# Rediseño Refugio del Corazón — Fase 4D: Agenda — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-pintar la página de Agenda del cuidador para que sea coherente con el sistema visual del rediseño. La Agenda ya está bien estructurada (texto grande, mobile-first); sólo se ajustan dos detalles para alinearla con el resto: el botón de WhatsApp pasa a usar el token de color `success` (igual que el calendario) en lugar de un verde hardcodeado, y la altura mínima usa `100dvh` en vez de `100vh` para evitar el salto de layout en navegadores móviles.

**Architecture:** Cambio puramente cosmético en un único archivo, `app/(caretaker)/agenda/page.tsx`. Sin cambios de datos, queries, lógica ni estructura de componentes.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, tokens de color de la Fase 1.

**Gestor de paquetes:** pnpm. Verificación: `pnpm typecheck`, `pnpm exec eslint`, `pnpm build`. No hay tests unitarios; la verificación es typecheck + eslint + build + revisión visual.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `app/(caretaker)/agenda/page.tsx` | Modificar | Botón WhatsApp con token `success`; `min-h-[100dvh]` en el `<main>`. |

---

## Task 1: Re-pintar la Agenda

**Files:**
- Modificar: `app/(caretaker)/agenda/page.tsx`

- [ ] **Step 1: Altura del `<main>`.** Reemplazar `className="min-h-screen bg-background px-4 py-6 md:px-10 md:py-10"` por `className="min-h-[100dvh] bg-background px-4 py-6 md:px-10 md:py-10"`.

- [ ] **Step 2: Botón de WhatsApp en `BigCard`.** Reemplazar las clases del enlace de WhatsApp `"inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white"` por `"inline-flex items-center gap-2 rounded-xl bg-success px-5 py-3 text-base font-semibold text-success-foreground"`.

- [ ] **Step 3: Verificar.**
  - `pnpm typecheck` → sin errores.
  - `pnpm exec eslint "app/(caretaker)/agenda/page.tsx"` → sin errores ni warnings.
  - `pnpm build` → build exitoso.

- [ ] **Step 4: Commit.**

```
git add "app/(caretaker)/agenda/page.tsx"
git commit -m "feat(agenda): re-pintar con tokens del rediseño"
```

---

## Verificación final de la Fase 4D

- [ ] `pnpm typecheck` y `pnpm build` sin errores.
- [ ] Revisión visual de `/agenda`: el botón WhatsApp usa el verde del sistema (`success`); el resto se ve igual; sin salto de layout en móvil.
