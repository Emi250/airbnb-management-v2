import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 pb-12">
      {/* Filter bar placeholder */}
      <Skeleton className="h-12 w-full" />

      {/* Pulso del mes: heading + 4 hero KPIs + 1 hero chart */}
      <div className="space-y-5">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>

      {/* Detalles: heading + 4 secondary KPIs */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>

      {/* Análisis: heading + 2 charts */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}
