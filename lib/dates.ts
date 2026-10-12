import { parseISO } from "date-fns";

/** Fecha de negocio, independiente de la zona del servidor o del navegador. */
export function businessDateISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function businessToday(): Date {
  return parseISO(businessDateISO());
}

function utcDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysInRange(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  return Math.round((utcDay(to) - utcDay(from)) / 86400000) + 1;
}

/** Rango del informe inclusivo; el check-out no ocupa noche. */
export function overlapNights(checkIn: string, checkOut: string, from: string, to: string): number {
  if (!checkIn || !checkOut || !from || !to || from > to) return 0;
  const start = Math.max(utcDay(checkIn), utcDay(from));
  const end = Math.min(utcDay(checkOut), utcDay(to) + 86400000);
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function overlappingReservations<T extends { check_in: string; check_out: string; status: string }>(
  reservations: T[], from: string, to: string
): T[] {
  return reservations.filter((r) => r.status !== "cancelled" && overlapNights(r.check_in, r.check_out, from, to) > 0);
}
