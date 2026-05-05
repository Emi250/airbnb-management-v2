import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Demoted reference KPI for the "Detalles del mes" row. Smaller value than HeroKpi,
 * no icon, no vs-target chip, optional accent for net-positive/negative coloring.
 */
export function SecondaryKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-xl lg:text-2xl font-semibold tabular-nums tracking-tight truncate",
            accent === "positive" && "text-success",
            accent === "negative" && "text-destructive"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
