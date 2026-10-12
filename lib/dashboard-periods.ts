import { endOfDay, endOfMonth, startOfMonth, subMonths, subYears, subDays } from "date-fns";

/** Compara magnitudes del mismo alcance; nunca un acumulado anual con un mes. */
export function comparisonPeriod(from: Date, to: Date, scope: "month" | "ytd" | "last12") {
  if (scope === "month") {
    const previous = subMonths(from, 1);
    return { from: startOfMonth(previous), to: endOfMonth(previous), label: "vs. mes anterior" };
  }
  if (scope === "ytd") {
    return { from: subYears(from, 1), to: endOfDay(subYears(to, 1)), label: "vs. mismo período del año anterior" };
  }
  return { from: subMonths(from, 12), to: endOfDay(subDays(from, 1)), label: "vs. 12 meses anteriores" };
}
