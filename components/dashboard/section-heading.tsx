import { cn } from "@/lib/utils";

/**
 * Type-only section heading. No card chrome, no border, no icon.
 * Used to anchor the three dashboard regions (Pulso / Detalles / Análisis).
 */
export function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
