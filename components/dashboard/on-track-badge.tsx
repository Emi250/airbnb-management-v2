import { cn } from "@/lib/utils";
import type { TargetStatus } from "@/lib/analytics-targets";

const LABELS: Record<TargetStatus, string> = {
  on_track: "En objetivo",
  below: "Bajo objetivo",
  no_target: "Sin objetivo",
};

const VARIANTS: Record<TargetStatus, string> = {
  // Solid in light mode (high contrast); soft tint in dark mode reads better
  on_track:
    "bg-success text-success-foreground dark:bg-success/15 dark:text-success",
  below:
    "bg-warning text-warning-foreground dark:bg-warning/15 dark:text-warning",
  no_target:
    "bg-muted text-muted-foreground",
};

export function OnTrackBadge({
  status,
  className,
}: {
  status: TargetStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANTS[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
