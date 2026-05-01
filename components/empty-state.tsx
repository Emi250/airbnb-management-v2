import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaLabel && ctaHref && (
        <Button asChild className="mt-6">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
