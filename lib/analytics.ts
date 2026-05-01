import { differenceInDays, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";

type Reservation = {
  property_id: string;
  check_in: string;
  check_out: string;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: string;
  status: string;
  nights: number;
  guest_id: string | null;
};

type PropertyLite = { id: string; name: string; color_hex: string | null };

type Expense = { property_id: string | null; date: string; amount_ars: number; category: string };

const ACTIVE = (r: Reservation) => r.status !== "cancelled";

/** Sum of revenue (ARS) where check_in falls in [from, to]. */
export function sumRevenue(reservations: Reservation[], from: Date, to: Date): number {
  return reservations
    .filter(ACTIVE)
    .filter((r) => {
      const ci = parseISO(r.check_in);
      return ci >= from && ci <= to;
    })
    .reduce((acc, r) => acc + Number(r.total_amount_ars), 0);
}

export function sumExpenses(expenses: Expense[], from: Date, to: Date): number {
  return expenses
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= from && d <= to;
    })
    .reduce((acc, e) => acc + Number(e.amount_ars), 0);
}

/** Outstanding balance across active reservations. */
export function outstandingBalance(reservations: Reservation[]): number {
  return reservations
    .filter(ACTIVE)
    .reduce((acc, r) => acc + (Number(r.total_amount_ars) - Number(r.amount_paid_ars)), 0);
}

/** Occupancy rate for a date range across the listed properties: occupied nights / available nights. */
export function occupancyRate(
  reservations: Reservation[],
  properties: PropertyLite[],
  from: Date,
  to: Date
): number {
  const days = differenceInDays(to, from) + 1;
  const totalAvailable = days * properties.length;
  if (totalAvailable === 0) return 0;

  let occupiedNights = 0;
  for (const r of reservations.filter(ACTIVE)) {
    const ci = parseISO(r.check_in);
    const co = parseISO(r.check_out);
    const start = ci > from ? ci : from;
    const end = co < to ? co : to;
    const overlap = differenceInDays(end, start);
    if (overlap > 0) occupiedNights += overlap;
  }
  return Math.min(1, occupiedNights / totalAvailable);
}

export function adr(reservations: Reservation[], from: Date, to: Date): number {
  const inRange = reservations.filter(ACTIVE).filter((r) => {
    const ci = parseISO(r.check_in);
    return ci >= from && ci <= to;
  });
  const nights = inRange.reduce((acc, r) => acc + r.nights, 0);
  if (nights === 0) return 0;
  const revenue = inRange.reduce((acc, r) => acc + Number(r.total_amount_ars), 0);
  return revenue / nights;
}

export function revPar(
  reservations: Reservation[],
  properties: PropertyLite[],
  from: Date,
  to: Date
): number {
  const days = differenceInDays(to, from) + 1;
  const total = days * properties.length;
  if (total === 0) return 0;
  const revenue = sumRevenue(reservations, from, to);
  return revenue / total;
}

/** Last N months of revenue, grouped per property. */
export function monthlyRevenueByProperty(
  reservations: Reservation[],
  properties: PropertyLite[],
  monthsBack = 12
) {
  const now = new Date();
  const months: { key: string; label: string; from: Date; to: Date }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM yy", { locale: es }),
      from: startOfMonth(d),
      to: endOfMonth(d),
    });
  }

  return months.map((m) => {
    const row: Record<string, string | number> = { month: m.label };
    let total = 0;
    for (const p of properties) {
      const v = sumRevenue(
        reservations.filter((r) => r.property_id === p.id),
        m.from,
        m.to
      );
      row[p.name] = v;
      total += v;
    }
    row.Total = total;
    return row;
  });
}

/** Monthly occupancy stacked per property. */
export function monthlyOccupancyByProperty(
  reservations: Reservation[],
  properties: PropertyLite[],
  monthsBack = 12
) {
  const now = new Date();
  const months: { label: string; from: Date; to: Date }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: format(d, "MMM yy", { locale: es }),
      from: startOfMonth(d),
      to: endOfMonth(d),
    });
  }
  return months.map((m) => {
    const row: Record<string, string | number> = { month: m.label };
    for (const p of properties) {
      row[p.name] =
        occupancyRate(
          reservations.filter((r) => r.property_id === p.id),
          [p],
          m.from,
          m.to
        ) * 100;
    }
    return row;
  });
}

export function revenueByPropertyYTD(reservations: Reservation[], properties: PropertyLite[]) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return properties.map((p) => ({
    name: p.name,
    color: p.color_hex ?? "#A47148",
    value: sumRevenue(
      reservations.filter((r) => r.property_id === p.id),
      yearStart,
      now
    ),
  }));
}

export function topGuests(
  reservations: Reservation[],
  guests: { id: string; name: string }[],
  limit = 10
) {
  const totals = new Map<string, number>();
  for (const r of reservations.filter(ACTIVE)) {
    if (!r.guest_id) continue;
    totals.set(r.guest_id, (totals.get(r.guest_id) ?? 0) + Number(r.total_amount_ars));
  }
  return Array.from(totals.entries())
    .map(([id, total]) => ({
      name: guests.find((g) => g.id === id)?.name ?? "—",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function revenueBySource(reservations: Reservation[]) {
  const sources = ["airbnb", "booking", "direct", "other"];
  return sources.map((s) => ({
    source: s.charAt(0).toUpperCase() + s.slice(1),
    revenue: reservations
      .filter(ACTIVE)
      .filter((r) => r.source === s)
      .reduce((acc, r) => acc + Number(r.total_amount_ars), 0),
  }));
}

/** Per-day occupancy heatmap for the current year. */
export function dailyOccupancy(reservations: Reservation[], properties: PropertyLite[]) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  const days = eachDayOfInterval({ start, end });
  return days.map((d) => {
    let occ = 0;
    for (const r of reservations.filter(ACTIVE)) {
      const ci = parseISO(r.check_in);
      const co = parseISO(r.check_out);
      if (d >= ci && d < co) occ += 1;
    }
    return {
      date: format(d, "yyyy-MM-dd"),
      occupied: occ,
      capacity: properties.length,
      ratio: properties.length > 0 ? occ / properties.length : 0,
    };
  });
}
