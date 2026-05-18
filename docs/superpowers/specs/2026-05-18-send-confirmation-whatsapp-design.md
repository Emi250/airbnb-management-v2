# Diseño — Botón "Enviar confirmación" por WhatsApp

Fecha: 2026-05-18

## Objetivo

Agregar un botón en la página de detalle de una reserva que abra WhatsApp
con el chat del teléfono del huésped y un mensaje de confirmación
pre-cargado. El administrador toca el botón y solo le queda presionar
"enviar" en WhatsApp.

## Alcance

- **Incluye:** un componente nuevo de botón en la página de detalle de
  reserva (`/reservations/[id]`).
- **No incluye:** cambios en server actions, schema, base de datos, ni en
  el formulario de creación/edición de reservas. No se registra ni
  persiste si la confirmación fue enviada.

## Ubicación y comportamiento

- El botón se renderiza en `app/(admin)/reservations/[id]/page.tsx`, como
  una fila propia entre el `PageHeader` y la grilla de tiles
  (Estado/Pago/Total/Saldo).
- Es visible siempre para cualquier reserva (coincide con la opción A
  acordada con el usuario): no marca estado, así que puede reusarse para
  reenviar la confirmación.
- **Con teléfono cargado:** el botón es un `<a>` (estilado como botón) que
  apunta a `https://wa.me/<numero>?text=<mensaje>`, con
  `target="_blank"` y `rel="noopener noreferrer"`. Abre WhatsApp (app o
  web) con el chat del huésped y el mensaje pre-cargado.
- **Sin teléfono:** se renderiza un `Button` deshabilitado, envuelto en un
  `<span title="Agregá un teléfono al huésped para enviar la confirmación">`
  para que el motivo sea visible al pasar el mouse.

## Componente

Archivo nuevo: `app/(admin)/reservations/[id]/send-confirmation-button.tsx`

- Client component (`"use client"`).
- Props: `{ guestName: string; guestPhone: string | null; totalAmount: number }`.
- Estilo: variante visual verde usando el token `success` del sistema de
  diseño, con ícono `MessageCircle` de `lucide-react`, para distinguirlo de
  las acciones del formulario.

## Normalización del teléfono

Se reutiliza el helper existente `whatsAppLink(phone)` de `lib/format.ts`,
que hace `phone.replace(/\D/g, "")` (quita `+`, espacios y guiones) y
devuelve `https://wa.me/<digitos>` o `null` si no hay dígitos.

El componente toma ese resultado y, si no es `null`, le agrega
`?text=${encodeURIComponent(mensaje)}`.

El usuario carga los teléfonos en formato internacional completo (ej:
`+54 9 3541 23-4567`), así que la limpieza de no-dígitos deja el número
listo para `wa.me`.

## Monto

Se usa el total completo de la reserva (`total_amount_ars`).

El template del mensaje ya contiene un `$` literal ("el total es de
$..."), por lo que se inserta solo el número formateado con
`formatNumber(totalAmount, 0)` de `lib/format.ts`, que produce el
separador de miles argentino (ej: `120.000`). Resultado en el mensaje:
`$120.000`.

## Mensaje

Template (con interpolación de `guestName` y monto), codificado con
`encodeURIComponent` antes de ir en la URL:

```
Hola {guestName}! Como estás? Mi nombre es Emilio y soy el administrador del alojamiento de Capilla del Monte, ante todo muchas gracias por la reserva. Te comento que la misma está asentada y el total es de ${monto}, que puede abonarse en efectivo o transferencia cuando lleguen. Como les quede más cómodo!

Días antes de que lleguen me voy a comunicar a este Whatsapp para brindarles toda la info del check in, igualmente por cualquier consulta quedo siempre a disposición! Gracias!
```

El salto de línea entre párrafos se incluye en el string (`\n\n`).

Si `guestName` está vacío, se usa un saludo neutro (ej: "Hola!" sin
nombre).

## Datos disponibles

La página de detalle ya carga la reserva con
`getReservation(id)`, que hace `guest:guests(*)`. Por lo tanto
`r.guest?.name` y `r.guest?.phone` están disponibles sin cambios en la
capa de queries.

## Verificación

- Reserva con teléfono internacional válido → el botón abre `wa.me` con
  número limpio y mensaje correcto (nombre y monto interpolados).
- Reserva sin teléfono → botón deshabilitado con tooltip explicativo.
- Reserva sin huésped (`guest` null) → botón deshabilitado (no hay
  teléfono).
- El mensaje conserva acentos y el salto de párrafo al abrirse en
  WhatsApp.
