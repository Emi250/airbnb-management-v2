import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency, toDate } from "@/lib/format";
import { BED_SETUP_LABEL } from "@/lib/reservation-options";
import type { BedSetup } from "@/types/supabase";

// Igual que lib/notifications/checkin-reminder.ts: el server corre en UTC, así
// que la fecha de emisión se calcula explícitamente en hora argentina.
const ARG_TZ = "America/Argentina/Cordoba";

/**
 * Qué certifica el comprobante, según cuánto se cobró:
 * - "sena":       se cobró una parte y queda saldo.
 * - "pago-total": está todo abonado.
 * - "reserva":    todavía no se cobró nada.
 */
export type ReceiptKind = "sena" | "pago-total" | "reserva";

/** Fila de `reservations` con sus relaciones, tal como la devuelve getReservation(). */
export type ReceiptReservation = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  bed_setup: BedSetup | null;
  property: { name: string } | null;
  guest: { name: string; phone: string | null } | null;
};

/** Todo ya formateado: el documento no hace cuentas ni toca fechas. */
export type ReceiptData = {
  kind: ReceiptKind;
  titulo: string;
  numero: string;
  emitido: string;
  huesped: { nombre: string; contacto: string | null };
  alojamiento: string;
  estadia: { rango: string; detalle: string };
  importes: { total: string; sena: string; saldo: string };
  /** Check-in como dd-MM-yyyy, solo para el nombre del archivo. */
  archivoFecha: string;
};

const TITULOS: Record<ReceiptKind, string> = {
  sena: "Comprobante de seña",
  "pago-total": "Comprobante de pago",
  reserva: "Comprobante de reserva",
};

/**
 * Normaliza el nombre de la unidad para un documento formal.
 *
 * "Airbnb 2", "Departamento #2" y "Depto 2" salen todos como "Departamento
 * N° 2": el número identifica la unidad y el canal de venta no va en un
 * comprobante. Cualquier otro nombre se respeta tal cual.
 */
const UNIDAD_NUMERADA =
  /^(?:departamentos?|deptos?\.?|dptos?\.?|airbnb|unidad)\s*(?:#|n[°º.]?)?\s*(\d+)$/i;

export function formatPropertyName(name: string | null | undefined): string {
  const limpio = name?.trim();
  if (!limpio) return "Alojamiento";
  const match = limpio.match(UNIDAD_NUMERADA);
  return match ? `Departamento N° ${match[1]}` : limpio;
}

/**
 * Prosa del rango de fechas, como en el comprobante de referencia:
 *   "entre el 20 y el 22 de noviembre de 2026"
 *   "entre el 30 de noviembre y el 2 de diciembre de 2026"
 *   "entre el 30 de diciembre de 2026 y el 2 de enero de 2027"
 */
export function formatStayRange(checkIn: string, checkOut: string): string {
  const from = toDate(checkIn);
  const to = toDate(checkOut);
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  const hasta = format(to, "d 'de' MMMM 'de' yyyy", { locale: es });
  if (sameMonth) return `entre el ${format(from, "d")} y el ${hasta}`;
  if (sameYear) {
    return `entre el ${format(from, "d 'de' MMMM", { locale: es })} y el ${hasta}`;
  }
  return `entre el ${format(from, "d 'de' MMMM 'de' yyyy", { locale: es })} y el ${hasta}`;
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

export function buildReceiptData(
  r: ReceiptReservation,
  now: Date = new Date()
): ReceiptData {
  // numeric(12,2) llega como number vía PostgREST; la coerción es barata y
  // protege de un futuro cambio a string.
  const total = Number(r.total_amount_ars) || 0;
  const sena = Number(r.amount_paid_ars) || 0;
  const saldo = Math.max(total - sena, 0);

  const kind: ReceiptKind =
    sena <= 0 ? "reserva" : saldo <= 0 ? "pago-total" : "sena";

  // Solo el teléfono: el email no siempre lo dan y un campo vacío o ausente
  // desbalancea el bloque del huésped.
  const contacto = r.guest?.phone?.trim() || "";

  return {
    kind,
    titulo: TITULOS[kind],
    // No hay columna de numeración: se deriva del UUID, que es estable.
    numero: `RDC-${r.id.slice(0, 8).toUpperCase()}`,
    emitido: new Intl.DateTimeFormat("es-AR", {
      timeZone: ARG_TZ,
      dateStyle: "long",
    }).format(now),
    huesped: {
      nombre: r.guest?.name?.trim() || "Huésped sin registrar",
      contacto: contacto || null,
    },
    alojamiento: formatPropertyName(r.property?.name),
    estadia: {
      rango: formatStayRange(r.check_in, r.check_out),
      // La configuración de camas solo aparece en los departamentos que la
      // ofrecen; en el resto el campo viene null.
      detalle: [
        plural(r.nights, "noche", "noches"),
        plural(r.num_guests, "persona", "personas"),
        ...(r.bed_setup ? [BED_SETUP_LABEL[r.bed_setup].toLowerCase()] : []),
      ].join(" · "),
    },
    importes: {
      total: formatCurrency(total, "ARS", undefined, 0),
      sena: formatCurrency(sena, "ARS", undefined, 0),
      saldo: formatCurrency(saldo, "ARS", undefined, 0),
    },
    archivoFecha: format(toDate(r.check_in), "dd-MM-yyyy"),
  };
}

/**
 * Nombre legible para el archivo descargado: qué es y de quién.
 * Ej: "Comprobante de seña - Ariel Larrubia - 20-11-2026.pdf".
 * La fecha de check-in evita que dos estadías del mismo huésped colisionen
 * en la carpeta de descargas.
 */
export function receiptFileName(d: ReceiptData): string {
  const nombre = d.huesped.nombre
    // Los caracteres que Windows y macOS no aceptan en un nombre de archivo.
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${d.titulo} - ${nombre} - ${d.archivoFecha}.pdf`;
}
