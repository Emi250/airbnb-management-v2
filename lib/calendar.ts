import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

export type CalendarDay = {
  /** Fecha de check-in en formato yyyy-MM-dd. */
  date: string;
  reservations: ReservationWithRefs[];
};

/**
 * Agrupa reservas por su día de check-in. Los días sin reservas no aparecen.
 * Días ordenados ascendente; dentro de cada día, por nombre de propiedad.
 */
export function groupByCheckInDay(reservations: ReservationWithRefs[]): CalendarDay[] {
  const map = new Map<string, ReservationWithRefs[]>();
  for (const r of reservations) {
    const list = map.get(r.check_in);
    if (list) list.push(r);
    else map.set(r.check_in, [r]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      reservations: list
        .slice()
        .sort((a, b) => (a.property?.name ?? "").localeCompare(b.property?.name ?? "")),
    }));
}

/**
 * Etiqueta relativa de un día respecto de hoy. Ambos argumentos en yyyy-MM-dd.
 * Devuelve "mañana" o "en N días" para los próximos 7 días; null en cualquier
 * otro caso (hoy, pasado, o más de 7 días en el futuro).
 */
export function relativeDayLabel(dateStr: string, todayStr: string): string | null {
  const diff = differenceInCalendarDays(parseISO(dateStr), parseISO(todayStr));
  if (diff === 1) return "mañana";
  if (diff > 1 && diff <= 7) return `en ${diff} días`;
  return null;
}
