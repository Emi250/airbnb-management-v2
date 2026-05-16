import { Phone, MessageCircle } from "lucide-react";
import { telLink, whatsAppLink } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Acciones rápidas de contacto para un huésped: Llamar (tel:) y WhatsApp (wa.me).
 * No renderiza nada si el teléfono es nulo/vacío o no produce un link válido.
 * Los enlaces tienen un área táctil >=44px para uso cómodo en mobile.
 * Con `showNumber` muestra además el número de teléfono como texto, para que
 * el operador lo vea de un vistazo (mismo patrón que las tarjetas del calendario).
 */
export function ContactActions({
  phone,
  name,
  showNumber = false,
  className,
}: {
  /** Teléfono crudo del huésped; puede ser null. */
  phone: string | null | undefined;
  /** Nombre del huésped, para etiquetas accesibles. */
  name?: string | null;
  /** Si es true, muestra el número de teléfono como texto junto a los botones. */
  showNumber?: boolean;
  className?: string;
}) {
  const tel = telLink(phone);
  const wa = whatsAppLink(phone);
  if (!tel && !wa) return null;

  const who = name?.trim() ? ` a ${name.trim()}` : "";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showNumber && phone?.trim() ? (
        <span className="numeric whitespace-nowrap text-sm text-muted-foreground">
          {phone.trim()}
        </span>
      ) : null}
      {tel ? (
        <a
          href={tel}
          aria-label={`Llamar${who}`}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Llamar</span>
        </a>
      ) : null}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir WhatsApp${who}`}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
