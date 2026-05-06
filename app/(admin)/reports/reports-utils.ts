// Helpers for /reports — all date logic uses LOCAL time and ISO date strings
// ("YYYY-MM-DD") so we can compare lexicographically, avoiding the UTC vs.
// local timezone bug that affected the previous month-filter implementation.

export type DateRange = { from: string; to: string };
export type PresetKey = "thisMonth" | "lastMonth" | "thisYear" | "lastYear";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfMonthISO(year: number, month1to12: number): string {
  return `${year}-${pad(month1to12)}-01`;
}

export function endOfMonthISO(year: number, month1to12: number): string {
  // Day 0 of the next month → last day of the given month
  const last = new Date(year, month1to12, 0).getDate();
  return `${year}-${pad(month1to12)}-${pad(last)}`;
}

export function presetRange(key: PresetKey): DateRange {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  switch (key) {
    case "thisMonth":
      return { from: startOfMonthISO(y, m), to: endOfMonthISO(y, m) };
    case "lastMonth": {
      const lm = m === 1 ? 12 : m - 1;
      const ly = m === 1 ? y - 1 : y;
      return { from: startOfMonthISO(ly, lm), to: endOfMonthISO(ly, lm) };
    }
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "lastYear":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
}

export function defaultRange(): DateRange {
  return presetRange("thisMonth");
}

/** Months between two ISO dates (inclusive) as YYYY-MM strings. */
export function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Most recent N month buckets ending at the current month, as YYYY-MM. */
export function lastNMonths(n: number): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}

/** Inclusive day count between two ISO dates. */
export function daysInRange(from: string, to: string): number {
  if (!from || !to || from > to) return 0;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * Nights of a reservation that fall inside [from, to] (inclusive).
 * A reservation occupies night N when guest is in the property the night
 * starting on N (so nights = check_out - check_in).
 */
export function overlapNights(
  checkIn: string,
  checkOut: string,
  from: string,
  to: string
): number {
  if (!checkIn || !checkOut) return 0;
  // Last occupied night = check_out - 1 day. Range in UTC for arithmetic.
  const [ciY, ciM, ciD] = checkIn.split("-").map(Number);
  const [coY, coM, coD] = checkOut.split("-").map(Number);
  const [fY, fM, fD] = from.split("-").map(Number);
  const [tY, tM, tD] = to.split("-").map(Number);
  const ci = Date.UTC(ciY, ciM - 1, ciD);
  const lastNight = Date.UTC(coY, coM - 1, coD) - 86_400_000;
  const f = Date.UTC(fY, fM - 1, fD);
  const t = Date.UTC(tY, tM - 1, tD);
  const start = Math.max(ci, f);
  const end = Math.min(lastNight, t);
  if (end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const lines: string[] = [];
  if (header.length > 0) lines.push(header.map(csvEscape).join(","));
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  const csv = lines.join("\n");
  // BOM so Excel detects UTF-8
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
