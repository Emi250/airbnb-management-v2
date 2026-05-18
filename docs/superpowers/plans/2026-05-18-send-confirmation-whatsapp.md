# Botón "Enviar confirmación" por WhatsApp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón en el detalle de reserva que abre WhatsApp con el chat del huésped y un mensaje de confirmación pre-cargado.

**Architecture:** Un client component nuevo (`SendConfirmationButton`) construye un link `wa.me` con el mensaje codificado. Se renderiza en la página de detalle de reserva (server component) pasándole nombre, teléfono y total del huésped. No toca server actions, schema ni base de datos.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, lucide-react. El proyecto no tiene framework de tests (no hay `vitest`/`jest`); la verificación es por `npm run typecheck`, `npm run lint` y comprobación en el navegador.

---

## File Structure

- **Create:** `app/(admin)/reservations/[id]/send-confirmation-button.tsx` — client component del botón. Construye el link `wa.me`, el mensaje, y maneja el estado deshabilitado.
- **Modify:** `app/(admin)/reservations/[id]/page.tsx` — renderiza el componente nuevo entre el `PageHeader` y la grilla de tiles.

Helpers reutilizados (sin cambios): `whatsAppLink` y `formatNumber` de `lib/format.ts`.

---

## Task 1: Componente SendConfirmationButton

**Files:**
- Create: `app/(admin)/reservations/[id]/send-confirmation-button.tsx`

- [ ] **Step 1: Crear el componente**

Crear `app/(admin)/reservations/[id]/send-confirmation-button.tsx` con este contenido exacto:

```tsx
"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsAppLink, formatNumber } from "@/lib/format";

function buildMessage(guestName: string, totalAmount: number): string {
  const greeting = guestName.trim() ? `Hola ${guestName.trim()}!` : "Hola!";
  const monto = formatNumber(totalAmount, 0);
  return (
    `${greeting} Como estás? Mi nombre es Emilio y soy el administrador del ` +
    `alojamiento de Capilla del Monte, ante todo muchas gracias por la reserva. ` +
    `Te comento que la misma está asentada y el total es de $${monto}, que puede ` +
    `abonarse en efectivo o transferencia cuando lleguen. Como les quede más cómodo!` +
    `\n\n` +
    `Días antes de que lleguen me voy a comunicar a este Whatsapp para brindarles ` +
    `toda la info del check in, igualmente por cualquier consulta quedo siempre a ` +
    `disposición! Gracias!`
  );
}

export function SendConfirmationButton({
  guestName,
  guestPhone,
  totalAmount,
}: {
  guestName: string;
  guestPhone: string | null;
  totalAmount: number;
}) {
  const baseLink = whatsAppLink(guestPhone);

  if (!baseLink) {
    return (
      <span
        title="Agregá un teléfono al huésped para enviar la confirmación"
        className="inline-block"
      >
        <Button
          disabled
          className="bg-success text-success-foreground hover:bg-success/90"
        >
          <MessageCircle aria-hidden />
          Enviar confirmación
        </Button>
      </span>
    );
  }

  const href = `${baseLink}?text=${encodeURIComponent(
    buildMessage(guestName, totalAmount)
  )}`;

  return (
    <Button
      asChild
      className="bg-success text-success-foreground hover:bg-success/90"
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden />
        Enviar confirmación
      </a>
    </Button>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS sin errores (el archivo no se importa todavía, pero debe compilar de forma aislada).

- [ ] **Step 3: Verificar lint**

Run: `npm run lint`
Expected: PASS sin errores ni warnings nuevos.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/reservations/[id]/send-confirmation-button.tsx"
git commit -m "feat(reservations): add SendConfirmationButton component"
```

---

## Task 2: Integrar el botón en la página de detalle

**Files:**
- Modify: `app/(admin)/reservations/[id]/page.tsx`

- [ ] **Step 1: Importar el componente**

En `app/(admin)/reservations/[id]/page.tsx`, agregar este import junto a los demás imports del tope del archivo:

```tsx
import { SendConfirmationButton } from "./send-confirmation-button";
```

- [ ] **Step 2: Renderizar el botón**

En el mismo archivo, insertar el botón entre el `<PageHeader ... />` y el `<div className="mb-6 grid gap-3 sm:grid-cols-4">`. El bloque debe quedar así:

```tsx
      <PageHeader
        title={`Reserva · ${r.guest?.name ?? "Sin huésped"}`}
        description={`${formatDateLong(r.check_in)} → ${formatDateLong(r.check_out)}`}
      />

      <div className="mb-6">
        <SendConfirmationButton
          guestName={r.guest?.name ?? ""}
          guestPhone={r.guest?.phone ?? null}
          totalAmount={r.total_amount_ars}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS sin errores.

- [ ] **Step 4: Verificar lint**

Run: `npm run lint`
Expected: PASS sin errores ni warnings nuevos.

- [ ] **Step 5: Verificar en el navegador**

Levantar el dev server (`npm run dev`) y abrir una reserva existente en `/reservations/[id]`:
- Reserva con huésped con teléfono → el botón verde "Enviar confirmación" aparece debajo del título. Al hacer click abre `wa.me` en pestaña nueva con el número limpio y el mensaje pre-cargado (nombre y monto correctos, acentos y salto de párrafo intactos).
- Reserva con huésped sin teléfono (o sin huésped) → el botón aparece deshabilitado; al pasar el mouse muestra el tooltip "Agregá un teléfono al huésped para enviar la confirmación".

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/reservations/[id]/page.tsx"
git commit -m "feat(reservations): show SendConfirmationButton on reservation detail"
```

---

## Self-Review

- **Spec coverage:** Ubicación (Task 2 Step 2 — entre PageHeader y tiles) ✓. Con/sin teléfono (Task 1) ✓. Normalización con `whatsAppLink` (Task 1) ✓. Monto total con `formatNumber(_, 0)` (Task 1) ✓. Mensaje con `encodeURIComponent` y nombre vacío manejado (Task 1) ✓. Estilo verde con token `success` + ícono (Task 1) ✓. Sin cambios en actions/schema/db ✓.
- **Placeholders:** ninguno; todo el código está completo.
- **Type consistency:** props `guestName`/`guestPhone`/`totalAmount` definidas en Task 1 y usadas idénticas en Task 2. `whatsAppLink` y `formatNumber` existen en `lib/format.ts`. `bg-success`/`text-success-foreground` existen como tokens en `globals.css`. `Button` soporta `asChild`.
