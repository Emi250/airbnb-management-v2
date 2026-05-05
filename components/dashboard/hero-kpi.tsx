"use client";

import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OnTrackBadge } from "./on-track-badge";
import type { TargetStatus } from "@/lib/analytics-targets";
import { cn } from "@/lib/utils";

export type HeroKpiProps = {
  /** Spanish label, e.g. "Ingresos del mes". */
  label: string;
  /** Pre-formatted display value, e.g. "$2.430.000". Pass null when there is no data in scope. */
  value: string | null;
  /** Status chip — pass null to hide the chip entirely (e.g. for KPIs that don't track against a target). */
  status?: TargetStatus | null;
  /** Pre-formatted vs-target delta, e.g. "+12%" or "-8%". Hidden when null. */
  vsTarget?: string | null;
  /** Pre-formatted MoM delta, e.g. "+5,2%". Hidden when null. */
  momDelta?: string | null;
  /** Sign of the MoM delta — drives color. "positive" | "negative" | "neutral". */
  momDirection?: "positive" | "negative" | "neutral";
  /** When true, all values render as Skeletons. */
  loading?: boolean;
  /** Slot for the inline "Editar objetivo" trigger. Pass a button (typically the trigger of KpiTargetPopover). */
  editTarget?: React.ReactNode;
};

export function HeroKpi({
  label,
  value,
  status,
  vsTarget,
  momDelta,
  momDirection = "neutral",
  loading,
  editTarget,
}: HeroKpiProps) {
  const isEmpty = value === null && !loading;

  return (
    <Card className="h-full">
      <CardContent className="p-5 md:p-6 flex flex-col gap-3 min-w-0">
        {/* Label */}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        {/* Big number */}
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-9 w-32 lg:h-10 lg:w-40" />
          ) : isEmpty ? (
            <p className="text-3xl lg:text-4xl font-semibold tracking-tight tabular-nums text-muted-foreground">
              —
            </p>
          ) : (
            <p className="text-3xl lg:text-4xl font-semibold tracking-tight tabular-nums truncate">
              {value}
            </p>
          )}
        </div>

        {/* Status row: badge + vs-target delta + edit trigger */}
        <div className="flex items-center gap-2 flex-wrap min-h-[1.5rem]">
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : status ? (
            <OnTrackBadge status={status} />
          ) : null}
          {!loading && vsTarget ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {vsTarget}
            </span>
          ) : null}
          {editTarget ? <span className="ml-auto">{editTarget}</span> : null}
        </div>

        {/* MoM delta */}
        {loading ? (
          <Skeleton className="h-3 w-28" />
        ) : isEmpty ? (
          <p className="text-xs text-muted-foreground">Sin datos en el período</p>
        ) : momDelta ? (
          <p
            className={cn(
              "text-xs tabular-nums",
              momDirection === "positive" && "text-success",
              momDirection === "negative" && "text-destructive",
              momDirection === "neutral" && "text-muted-foreground"
            )}
          >
            {momDelta} vs. mes anterior
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">&nbsp;</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Default trigger for the inline target popover. Compose into HeroKpi via the
 * `editTarget` slot. The popover wires itself in Task 8.
 */
export function EditTargetTrigger({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        className
      )}
    >
      <Pencil className="h-3 w-3" />
      Editar objetivo
    </button>
  );
}
