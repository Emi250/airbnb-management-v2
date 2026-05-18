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
