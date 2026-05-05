import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export type Currency = "ARS" | "USD" | "EUR";

export function formatCurrency(
  amountArs: number,
  currency: Currency = "ARS",
  rates?: { ars_per_usd: number; ars_per_eur: number },
  fractionDigits = 2
): string {
  let value = amountArs;
  if (currency === "USD" && rates) value = amountArs / rates.ars_per_usd;
  if (currency === "EUR" && rates) value = amountArs / rates.ars_per_eur;

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatPercent(n: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function formatDateLong(value: string | Date): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateShort(value: string | Date): string {
  return format(toDate(value), "dd MMM yyyy", { locale: es });
}

export function formatDateISO(value: string | Date): string {
  return format(toDate(value), "yyyy-MM-dd");
}

export function formatWeekday(value: string | Date): string {
  return format(toDate(value), "EEEE d 'de' MMMM", { locale: es });
}

export function whatsAppLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 0 ? null : `https://wa.me/${digits}`;
}

export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length === 0 ? null : `tel:${cleaned}`;
}
