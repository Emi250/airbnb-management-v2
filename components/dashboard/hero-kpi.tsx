"use client";

import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OnTrackBadge } from "./on-track-badge";
import type { TargetStatus } from "@/lib/analytics-targets";
import { cn } from "@/lib/utils";

export type HeroKpiSize = "lg" | "sm";

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
  /**
   * Visual weight. "lg" is the dashboard hero (big number, generous padding).
   * "sm" is a demoted supporting KPI (smaller number, lighter card). Default "lg".
   */
  size?: HeroKpiSize;
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
  size = "lg",
  loading,
  editTarget,
}: HeroKpiProps) {
  const isEmpty = value === null && !loading;
  const isLg = size === "lg";

  return (
    <Card className={cn("h-full", !isLg && "bg-secondary/40 shadow-none")}>
      <CardContent
        className={cn(
          "flex flex-col min-w-0",
          isLg ? "p-5 md:p-6 gap-3" : "p-4 gap-2"
        )}
      >
        {/* Label */}
        <p
          className={cn(
            "font-medium text-muted-foreground",
            isLg ? "text-sm" : "text-xs"
          )}
        >
          {label}
        </p>

        {/* Big number */}
        <div className="min-w-0">
          {loading ? (
            <Skeleton
              className={cn(isLg ? "h-10 w-44 lg:h-12 lg:w-52" : "h-7 w-28")}
            />
          ) : isEmpty ? (
            <p
              className={cn(
                "font-semibold tracking-tight tabular-nums text-muted-foreground",
                isLg ? "text-4xl lg:text-5xl" : "text-xl lg:text-2xl"
              )}
            >
              —
            </p>
          ) : (
            <p
              className={cn(
                "font-semibold tracking-tight tabular-nums truncate",
                isLg ? "text-4xl lg:text-5xl" : "text-xl lg:text-2xl"
              )}
            >
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
 * `editTarget` slot.
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
