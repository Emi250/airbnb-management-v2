"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { normalizeArPhone, buildWhatsAppLink } from "@/lib/notifications/whatsapp";

// Identificadores estables: el enlace no depende de cómo se renombre la propiedad.
const PUBLIC_UNITS: Record<string, { number: number; url: string }> = {
  "11111111-1111-1111-1111-111111111111": { number: 1, url: "https://refugiodelcorazon.com.ar/unidades/unidad-1/" },
  "22222222-2222-2222-2222-222222222222": { number: 2, url: "https://refugiodelcorazon.com.ar/unidades/unidad-2/" },
  "33333333-3333-3333-3333-333333333333": { number: 3, url: "https://refugiodelcorazon.com.ar/unidades/unidad-3/" },
  "44444444-4444-4444-4444-444444444444": { number: 4, url: "https://refugiodelcorazon.com.ar/unidades/unidad-4/" },
};

function buildMessage(guestName: string, totalAmount: number, propertyId: string, propertyName: string): string {
  const greeting = guestName.trim() ? `Hola ${guestName.trim()}!` : "Hola!";
  const monto = formatNumber(totalAmount, 0);
  const unit = PUBLIC_UNITS[propertyId];
  const department = unit
    ? ` y el departamento reservado fue el #${unit.number} (${unit.url})`
    : propertyName.trim() ? ` y el departamento reservado fue ${propertyName.trim()}` : "";
  return (
    `${greeting} Como estás? Mi nombre es Emilio y soy el administrador del ` +
    `alojamiento de Capilla del Monte, ante todo muchas gracias por la reserva. ` +
    `Te comento que la misma está asentada${department}.` +
    `\n\n` +
    `El total es de $${monto}, que puede abonarse en efectivo o transferencia cuando lleguen.` +
    `\n\n` +
    `Días antes de que lleguen me voy a comunicar a este Whatsapp para brindarles ` +
    `toda la info del check in, igualmente por cualquier consulta quedo siempre a ` +
    `disposición. Muchas gracias!`
  );
}

export function SendConfirmationButton({
  guestName,
  guestPhone,
  totalAmount,
  propertyId,
  propertyName,
}: {
  guestName: string;
  guestPhone: string | null;
  totalAmount: number;
  propertyId: string;
  propertyName: string;
}) {
  const phone = normalizeArPhone(guestPhone);

  if (!phone) {
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

  const href = buildWhatsAppLink(phone, buildMessage(guestName, totalAmount, propertyId, propertyName));

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
