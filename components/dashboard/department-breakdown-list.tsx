import { formatCurrency, formatPercent, type Currency } from "@/lib/format";
import type { ExchangeRate } from "@/types/supabase";

export type DepartmentBreakdownRow = {
  /** Department id — used as React key. */
  id: string;
  /** Department name, e.g. "Airbnb 1". */
  name: string;
  /** Color swatch hex, e.g. "#A47148". */
  color: string;
  /** YTD revenue in ARS. */
  revenueYtd: number;
  /** Occupancy over the YTD window as a fraction 0..1. */
  occupancy: number;
};

/**
 * Lista sin chrome de tarjeta para "Análisis por departamento".
 * Una fila por departamento: punto de color, nombre, ocupación % e ingresos YTD.
 * Filas separadas por divisores finos (divide-y). Reemplaza al donut.
 */
export function DepartmentBreakdownList({
  rows,
  currency,
  rate,
}: {
  rows: DepartmentBreakdownRow[];
  currency: Currency;
  rate: ExchangeRate;
}) {
  const hasData = rows.some((r) => r.revenueYtd > 0);

  if (rows.length === 0 || !hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {row.name}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatPercent(row.occupancy)}
          </span>
          <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums">
            {formatCurrency(row.revenueYtd, currency, rate, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
